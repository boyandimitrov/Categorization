module.exports = {
    unknown_error               : (msg) => ({error: -1000, message: "Unknown error. \n" + (msg || ''), http_code: 500}),
    internal_server_error       : (msg) => ({error: -1001, message: "Request can not be processed. \n" + (msg || ''), http_code: 400}),
    unauthorized                : (msg) => ({error: -1002, message: "Not authorized. \n" + (msg || ''), http_code: 401}),
    bad_request                 : (msg) => ({error: -1003, message: "Bad request. \n" + (msg || ''), http_code: 400}),
    invalid_token               : (msg) => ({error: -1004, message: "Security check failed. supply a valid jwt token. \n "  + (msg || ''), http_code: 400}),
    db_connection_failed        : (msg) => ({error: -1005, message: "Can not establish database connection. \n "  + (msg || ''), http_code: 400}),
    db_error                    : (msg) => ({error: -1006, message: "Database error. \n "  + (msg || ''), http_code: 400})
};