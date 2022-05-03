const axios = require('axios');
const form_data = require('form-data');

let proxy_call = async(segment, unique_id, data, options) => 
    new Promise((resolve, reject) => {
        const form = new form_data();
        form.append('unique_id', unique_id.toString());
        form.append('data', JSON.stringify(data));
        form.append('options', JSON.stringify(options));
    
        var config = {
            'method': 'POST',
            'url': `${process.env.AI_URL}${segment}`,
            headers: { 
                ...form.getHeaders()
            },
            'timeout': 600000,
            decompress: true
        };

        console.log('proxy call', JSON.stringify(config));
        config.data = form;

        axios(config)
            .then(function (response) {
                if ( response.status !== 200 ) {
                    let err = {};
                    try {
                        err = JSON.parse(response.data);
                    }
                    catch (e) {}
                    finally {
                        return reject ({http_code : response.status, message :err.message})
                    }
                }
    
                return resolve(JSON.stringify(response.data));
            })
            .catch(function(error) {
                debugger
                console.log('error', error);
                return reject(error);
             }) 
    });

module.exports = {
    proxy_call
}