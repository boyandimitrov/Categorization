const errors = require("./errors");

let send = (res, result) => {

    if ( result && result.error ) {
        console.error(new Date(), new Error(JSON.stringify(result)));
        if ( !result.http_code ) {
            return res.status(500).json({error : {code : result.error, text : result.message}});
        }
        else {
            return res.status(result.http_code).json({error : { code: result.error, text : result.message }});
        }
    }

    return res.json({result: result});
};

let send_error = (res, err) => {
    let errResponse = {};
    if (err instanceof Object)
    {
        errResponse = {...err};
    }
    else {
        errResponse = errors.unknown_error(err);
    }

    send(res, errResponse)
};

module.exports = {
    send      : send,
    send_error: send_error
};
