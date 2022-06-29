const { fork } = require('child_process');

const errors = require("../common/errors");
const ai_proxy = require('../common/proxy');
const file_util = require('../common/file');
const {TrainingStatus} = require("../common/consts");
const fe = require("../features/extraction");
const matrix = require("../features/matrix");
const host = require("../services/host").get_host(process.env.SERVICE_HOST);

const create = async(data) => {
    await host.db_service.create_tenant(data);
}

const configure_domain = async(data) => {
    await host.db_service.index_domain(data);
}

const add_training_data = async(data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    data.features = await fe.process(domain, data.title)

    await host.db_service.add_training_data(domain, data);
}

const add_training_data_attachment = async(data, attachment) => {
    data.content = await file.get_content(attachment, data);

    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    let concatenated = [data.title, data.content].join(" ");
    data.features = await fe.process(domain, concatenated);

    await host.db_service.add_training_data(domain, data);
}

const add_training_data_email = async(data, attachment) => {
    data.content = await file.get_content(attachment, data);

    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    let email_to = data.email_to && data.email_to.length ? data.email_to.join(";") : data.email_to || "";
    let concatenated = [data.title, data.email_subject, data.email_body, data.email_from, email_to, data.content].join(" ");
    data.features = await fe.process(domain, concatenated);

    await host.db_service.add_training_data(domain, data);
}

const train = async (data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    await host.db_service.update_post_train_domain(domain, {training_status: TrainingStatus.Pending});

    let train_task = async (data) => { 
        const child = fork('./app_child.js');
        child.send(data);
        child.on('message', data => {
            console.log('tenant is trained.', data)
        });
    }

    host.queue_service.add_task(train_task, data)
}

let get_training_status = async(data) => {
    try {
        const domain = await host.db_service.get_domain(data);
        if ( ! domain ) {
            return TrainingStatus.NotExisting;
        }
    
        return domain.training_status || TrainingStatus.NotTrained;
    }
    catch(e) {
        console.log(e);
    }
};

const alter_boost = async (data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    let existing_boosts = domain.boosts || {};
    let new_boosts = data.boosts || [];
    
    for (let i=0; i < new_boosts.length; i++) {
        let b = new_boosts[i] || {};

        if ( existing_boosts[b.term] ) {
            if ( b.clear ) {
                delete existing_boosts[b.term];
                continue;
            }
        }
        
        existing_boosts[b.term] = { ...b}
    }

    await host.db_service.update_post_train_domain(domain, {boosts: existing_boosts});
}

const get_model = (domain, training_set) => {
    const options = domain.options || {};
    const features = domain.features || {};

    options.no_add_title = true;
    return fe.prepare_training_set(training_set, features, options);
}

const get_predict_response = async(domain, data) => {
    let model = get_model(domain, [data]);

    let response = await ai_proxy.proxy_call('predict_proba', domain._id, {x_test : model}, {})

    return JSON.parse(response);

}

const get_categories = (domain, json) => {
    let cats = json.indexes[0];
    let result = [];
    for ( let key in cats ) {
        if ( cats[key] > 0) {
            result.push({
                category: domain.options.categories[parseInt(key)],
                proba: cats[key].toFixed(2) 
            })
        }
    }

    return result;
}

let compiled_boosts = {};

let boost_category = (categories, item) => {
    categories = categories || [];
    let boosted = false;
    for (let i=0; i < categories.length; i++) {
        if ( categories[i].category === item.category )  {
            boosted = true;
            categories[i].proba = parseFloat(categories[i].proba) * item.boost;

            if ( categories[i].proba < item.min_threshold ) {
                categories[i].proba = item.min_threshold;
            }

            if ( categories[i].proba > 1) {
                categories[i].proba = 1;
            }

            categories[i].proba = categories[i].proba.toFixed(2);
        }
    }

    if ( !boosted ) {
        categories.push({
            category : item.category,
            proba : item.min_threshold
        })
    }

    return categories;
}

let boost_categories = (title, categories, domain) => {
    if ( domain.boosts) {
        for (let key in domain.boosts) {
            let boost = domain.boosts[key];
            let boosts = [];
            if ( key === "{{categories}}" ) {
                boosts = domain.options.categories.map(cat => { return {
                    term: cat.toUpperCase(),
                    category : cat,
                    boost : boost.boost,
                    min_threshold : boost.min_threshold
                }})
            }
            else {
                boosts = [boost];
            }

            for (let i=0; i<boosts.length; i++) {
                let boost_term = boosts[i].term.toUpperCase();
                if ( !compiled_boosts[boost_term] ) {
                    compiled_boosts[boost_term] = new RegExp(`${boost_term}`);
                }
                const re = compiled_boosts[boost_term];

                if ( re.test(title.toUpperCase())) {
                    categories = boost_category(categories, boosts[i]);
                }
            }

        }
    }

    return categories;
}

const format_response = (categories, threshold) => {
    if (threshold) {
        categories = categories
            .filter(item => {
                let f = parseFloat(item.proba);
                return f >= threshold;
            })
    }
    console.log(categories);
    categories = categories
        .sort(function(a, b) {
            if ( !a.proba || !b.proba) {
                return 0;
            } 

            let af = parseFloat(a.proba);
            let bf = parseFloat(b.proba);
            return bf - af;
        })

    return categories;
}

const predict = async (data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    data.features = await fe.process(domain, data.title);
    let json = await get_predict_response(domain, data);

    let categories = get_categories(domain, json);
    
    let result = boost_categories(data.title, categories, domain);

    result = format_response(result);
    return {categories : result};

}

const predict_top = async(data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    data.features = await fe.process(domain, data.title);
    let json = await get_predict_response(domain, data);

    let categories = get_categories(domain, json);

    let result = boost_categories(data.title, categories, domain);

    return prepare_top_response(result, data.threshold);
}

const predict_file = async (file, data) => {
    const domain = await host.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    const content = await file_util.get_content(file, data);

    data.email_to = data.email_to && data.email_to.length ? data.email_to.join(";") : data.email_to || "";
    let values = Object.keys(data).map(key => data[key]);
    values.push(content);
    let concatenated = values.join(" ");

    data.features = await fe.process(domain, concatenated);

    let json = await get_predict_response(domain, data);

    let categories = get_categories(domain, json);

    let result = boost_categories(data.title, categories, domain);

    result = format_response(result, data.threshold);
    return {categories : result};
}

const prepare_top_response = ({categories}) => {
    categories = categories
        .map(item=> item.category);

    return {top : (categories && categories.length ? categories[0] : "")};
}

let confusion_matrix = async(data) => {
    try {
        const domain = await host.db_service.get_domain(data);
        if ( ! domain ) {
            return errors.db_error('Domain is not registered!');
        }
    
        let result = matrix.confusion_matrix(domain.options.categories, domain.matrix);

        return {
            matrix:result
        };    
    }
    catch(e) {
        console.log(e);
    }
};

let evaluate = async(data) => {
    try {
        let result = TrainingStatus.NotTrained;
        const domain = await host.db_service.get_domain(data);
        if ( ! domain ) {
            return errors.db_error('Domain is not registered!');
        }
    
        return domain.accuracy;
    }
    catch(e) {
        console.log(e);
    }
};

module.exports = {
    create, configure_domain, add_training_data, add_training_data_attachment, add_training_data_email, train, get_training_status, alter_boost, predict, predict_top, prepare_top_response, predict_file, confusion_matrix, evaluate
}
