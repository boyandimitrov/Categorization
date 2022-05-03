const path = require('path');
const csv_writer = require('csv-writer').createArrayCsvWriter;

const transformers = require("./transformers.js");

let execute_by_type = async (title, type, cfg, algo_config) => {
    if ( !transformers[type]) {
        throw 'unknown rule.'
    }
   
    return await transformers[type](title, cfg, algo_config);
}

let process = async (domain, title) => {

    const rules = domain.rules || require(`../../FileBank/features/rules.json`);

    for ( let j=0; j < rules.length; j++ ) {
        let transformation = rules[j].type;
        let transform_config = {...rules[j]};

        title = await execute_by_type(title, transformation, transform_config, domain.options);
    }
    
    return title;
}

const get_features_hash = (data, ignore_list, hash={}) => {
    ignore_list = ignore_list || [];

    for ( let i=0; i< data.length; i++ ) {
        let parts = data[i].features.split(" ");

        parts.forEach((part => {
            if ( ignore_list.indexOf(part) === -1 ) {
                if ( !hash[part] ) {
                    hash[part] = 0;
                }
                hash[part]++;
            }
        }))
    }

    return hash;
}

const get_top_features = (hash, top=100) => {
    let keys = Object.keys(hash);
    keys.sort(function(a, b) {
        return hash[a] - hash[b]
    }).reverse();
    
    top = top || keys.length;
    let result = keys.slice(0, top);
    return result;
}

let prepare_training_set = (documents, top_features, options) => {
    const categories = options.categories || [];

    if ( !categories.length ) {
        throw "cannot train without categories."
    }
    
    let headers = categories.map(item => item.toUpperCase()).map((item, idx) => `cat${idx}`);

    let model = [top_features.concat( headers )];

    if ( !options.no_add_title ) {
        model[0].push("service__title");
    }

    let match;
    for (let i=0; i< documents.length; i++) {
        match = [];

        let parts = documents[i].features.split(" ");
        top_features.forEach(feature => {
            if (parts.indexOf(feature) > -1) {
                match.push(1);
            }
            else {
                match.push(0);
            }
        })

        if ( documents[i].categories ) {
            let values = documents[i].categories;
            categories.forEach(cat => {
                if ( values.indexOf(cat) > -1) {
                    match.push(1);
                }
                else {
                    match.push(0);
                }
            })
        }
        else {
            categories.forEach(cat => {
                match.push(0);
            })
        }

        if ( !options.no_add_title ) {
            match = match.concat([documents[i].title]);
        }
    
        model.push(match);
    }

    //console.log(top_features);
    return model;
}

let save_to_csv = async(model, unique_key) => 
    new Promise((resolve, reject) => {
        const features = model[0];
        const training_data = model.slice(1);

        let csv_path = path.resolve(__dirname, '../../FileBank/models/training/', `${unique_key}.csv`);
        const writer = csv_writer({
            header: features,
            path: csv_path
        });
    
        writer.writeRecords(training_data)
            .then(() => {
                return resolve();
            })
            .catch((e)=> {
                console.error(e);
                return reject(e);
            });
    });

module.exports = {
    process, get_features_hash, get_top_features, prepare_training_set, save_to_csv
}