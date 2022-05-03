let fs               = require('fs');
let jwt              = require('jsonwebtoken');
let uuid              = require('uuid').v4;
let yaml             = require('js-yaml');
let config           = require('@bioseek/core/config');
let directory_reader = require('@bioseek/core/directory_reader.js');
let utils            = require("@bioseek/core/utilities/utils.js");
let errors           = require("@bioseek/core/utilities/errors.js");
let token_util       = require("@bioseek/core/token.js");
let SwaggerExpress   = require('swagger-express-mw');

let read_swagger_settings = (root_dir) => {

    let swagger_settings;

    try {
        swagger_settings         = yaml.safeLoad(fs.readFileSync(`${root_dir}${config.get(`${server_name}:swagger:conf_path`)}`, 'utf8'));
        swagger_settings.host    = config.get(`${server_name}:swagger:host_url`);
        swagger_settings.schemes = [config.get(`${server_name}:swagger:schema`)];
        let definitions = directory_reader(`${__dirname}/../swagger/_auto_generate_definitions/`, "json");
        utils.objEach(definitions, (key, value) => {
            if (!value.server_name || value.server_name === server_name) {
                swagger_settings.definitions = Object.assign(swagger_settings.definitions || {}, value.schema)
            }
        });
    }
    catch (err) {
        console.log(err);
    }
    return swagger_settings
};

let get_swagger_object = (swagger_settings, root_dir) => {

    return {
        appRoot: root_dir, // required config
        swagger: swagger_settings,
        swaggerSecurityHandlers : {
            "authorization" : function securityHandler1(req, authOrSecDef, scopesOrApiKey, cb) {
                let onError = () => {
                    console.error('Security check failed. supply a valid jwt token');
                    let err = new Error();
                    err.statusCode=403;
                    err = Object.assign(err, errors.invalid_token());
                    return cb(err);
                };

                if ( scopesOrApiKey ) {
                    let token = scopesOrApiKey.split(' ')[1];
                    let sha_noise = config.get('auth:sha_noise');
                    console.log('authenticate swagger', token);
                    jwt.verify(token, sha_noise, function(err, result) {
                        if ( err ) {
                            if (req.useragent.isiPad || req.useragent.isiPhone || req.useragent.isAndroid) { //todo Remove on 01.10.2020
                                req.decoded_user = {"_id" : uuid(), first_name: "fake", last_name: "user"};
                                return cb()
                            }
                            return onError();
                        }
                        else {
                            req.decoded_user = result;
                            return cb();
                        }
                    });
                }
                else {
                    console.error(req.originalUrl);
                    return onError();
                }
            }
        }
    };
};

let init = async(app, root_dir) =>
{
    let swagger_settings = read_swagger_settings(root_dir);
    fs.writeFileSync(__dirname + "/../mobile/src/api/swagger_schema.json", JSON.stringify(swagger_settings), "utf8");
    app.get("/api/swagger", (req, res) =>
    {
        res.setHeader("Cache-Control", "max-age=100");
        res.setHeader("Content-Type", "application/json");
        res.send(swagger_settings)
    });

    return new Promise((resolve, reject) => {
        SwaggerExpress.create(get_swagger_object(swagger_settings, root_dir), (err, swaggerExpress) => {
            if (err) {
                return reject(err)
            }
            resolve(swaggerExpress);
        });
    })
};

module.exports = {
    init
};