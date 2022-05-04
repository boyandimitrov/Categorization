//require('./api/global_init')
require('dotenv').config();

const express       = require('express');
const bodyParser    = require('body-parser');
const cookieParser  = require('cookie-parser');
const fs            = require('fs');
const SwaggerExpress= require('swagger-express-mw');
const yaml          = require('js-yaml');
const nocache       = require('nocache');
const jwt           = require("jsonwebtoken");
const multer        = require('multer');

const middleware = require("./api/middleware");
const crypt = require("./api/common/crypt");
const errors = require("./api/common/errors.js");
const host = require("./api/services/host");

let app = express();

const uploadSwagger = multer({
    dest: __dirname + '/uploads/' // this saves your file into a directory called "uploads"
});

module.exports = app; // for testing

let configExpress = (app) => {
    app.use(nocache());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true,
        limit: "10mb"
    }));

    app.use(cookieParser());

    app.get('/test', (req, res) => res.send({"test" : "ok"}));
}

let startServer = async (app, port) => {
    configExpress(app);

    let server = app.listen(port, '0.0.0.0');

    host.register(process.env.SERVICE_HOST);

    console.log('Server is READY!!!', 'port:', port);
};

let configSwagger = () => {
    let swaggerObject;
    try {
        swaggerObject         = yaml.safeLoad(fs.readFileSync(__dirname + process.env.SWAGGER_PATH, 'utf8'));
        swaggerObject.host    = `${process.env.SWAGGER_HOST}${process.env.SWAGGER_PORT ? `:${process.env.SWAGGER_PORT}` : ""}`;
        swaggerObject.schemes = [process.env.SWAGGER_SCHEMA];
    }
    catch (err) {
        console.log(err);
    }

    return {
        appRoot: __dirname, // required config
        swagger: swaggerObject,
        swaggerSecurityHandlers : {
            "authorization" : async function securityHandler1(req, authOrSecDef, scopesOrApiKey, cb) {
                let onError = () => {
                    console.error('Security check failed. supply a valid jwt token');
                    let err = new Error();
                    err.statusCode=403;
                    err = Object.assign(err, errors.invalid_token());
                    return cb(err);
                };

                if ( scopesOrApiKey ) {
                    let token = scopesOrApiKey.split(' ')[1];

                    if ( crypt.sha1(token) === process.env.SWAGGER_API_KEY) {
                        console.log('service call with bearer and guid')
                        req.service_call =true;
                        return cb();
                    }
                }
                console.error(req.originalUrl);
                return onError("API Key verification failed.");
            }
        }
    };
};

app.get("/api/swagger", (req, res, next) =>
{
    res.setHeader("Cache-Control", "max-age=1000");
    next()
});

SwaggerExpress.create(configSwagger(), (err, swaggerExpress) => {
    if (err) { throw err; }
    //app.use( compression() );
    app.use(nocache());
    app.use( middleware.allowCrossOrigin() );
    app.use( uploadSwagger.fields([{name: 'attachment'}]));

    swaggerExpress.register(app);

    startServer(app, process.env.SWAGGER_PORT)
        .catch((err) =>
        {
            console.error(err)
        })
});

process.on('uncaughtException', function (err, data)
{
    console.log("--- UNCAUGHT EXCEPTION ---");
    console.log(err);
    console.log("[Inside 'uncaughtException' event] " + err.stack || err.message);
    console.log(data);
});

