const jwt = require("jsonwebtoken");

const response_utils = require("../common/response_utils");
const categorize = require("../handlers/categorization");
const errors = require("../common/errors");

let test = (req, res) => {
    return response_utils.send(res, {text: "swagger ok"})
}

let create = async (req, res) => {
    try {
        let params = req.swagger.params.data.value;

        let result = await categorize.create(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let configure_domain = async (req, res) => {
    try {
        let params = req.swagger.params.data.value;

        let result = await categorize.configure_domain(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let add_training_data = async (req, res) => {
    try {
        let params = req.swagger.params.data.value;

        let result = await categorize.add_training_data(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let add_training_data_attachment = async (req, res) => {
    try {
        let file = req.files.attachment[0];
        
        let params = {};
        for ( let key in req.swagger.params ) {
            params[key] = req.swagger.params[key].value;
        }

        let result = await categorize.add_training_data_attachment(params, file);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let add_training_data_email = async (req, res) => {
    try {
        let file = req.files.attachment[0];
        
        let params = {};
        for ( let key in req.swagger.params ) {
            params[key] = req.swagger.params[key].value;
        }

        let result = await categorize.add_training_data_email(params, file);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let train = async (req, res) => {
    try {
        let params = req.swagger.params.data.value;

        let result = await categorize.train(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

const get_training_status = async(req, res) => {
    try {
        let params = {
            unique_id : req.swagger.params.unique_id.value,
            domain : req.swagger.params.domain.value
        }

        let result = await categorize.get_training_status(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

let predict = async (req, res) => {
    try {
        let params = {
            unique_id : req.swagger.params.unique_id.value,
            domain : req.swagger.params.domain.value,
            title : req.swagger.params.title.value
        }

        let result = await categorize.predict(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

const confusion_matrix = async(req, res) => {
    try {
        let params = {
            unique_id : req.swagger.params.unique_id.value,
            domain : req.swagger.params.domain.value
        }

        let result = await categorize.confusion_matrix(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

const evaluate = async(req, res) => {
    try {
        let params = {
            unique_id : req.swagger.params.unique_id.value,
            domain : req.swagger.params.domain.value
        }

        let result = await categorize.evaluate(params);
        return response_utils.send(res, result);
    }
    catch(e) {
        return response_utils.send_error(res, errors.internal_server_error(e))
    }
}

module.exports = {
    test, create, configure_domain, add_training_data, add_training_data_attachment, add_training_data_email, train, get_training_status, predict, confusion_matrix, evaluate
}