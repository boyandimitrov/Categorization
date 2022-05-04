const fe = require("./api/features/extraction");
const errors = require("./api/common/errors");
const host = require("./api/services/host");
const ai_proxy = require('./api/common/proxy');
const {TrainingStatus} = require("./api/common/consts");

host.register(process.env.SERVICE_HOST);

const train = async(data) => {
    let h = host.get_host(process.env.SERVICE_HOST);

    const domain = await h.db_service.get_domain(data);
    if ( ! domain ) {
        return errors.db_error('Domain is not registered!');
    }

    let training_set = await h.db_service.get_training_data(data);
    console.log('training_set count', (training_set || []).length)
    if ( ! training_set || !training_set.length ) {
        h.db_service.update_post_train_domain(domain, {
            training_status: TrainingStatus.Failed
        }) 
    
        return errors.db_error('There is no domain data!');
    }


    const options = domain.options || {};

    let feautre_hash = fe.get_features_hash(training_set, options.ignore_list);

    let top_features = fe.get_top_features(feautre_hash, options.top_features);

    let model = fe.prepare_training_set(training_set, top_features, options);

    await fe.save_to_csv(model, domain._id);

    console.log('call train', domain._id, domain.options);
    let response = await ai_proxy.proxy_call('train', domain._id, {}, {options:domain.options});

    let json = JSON.parse(response);

    console.log('python response', response.accuracy);

    h.db_service.update_post_train_domain(domain, {
        accuracy : json.accuracy,
        matrix : {
            prediction: json.prediction, 
            test : json.test
        },
        features: top_features,
        training_status: TrainingStatus.Trained
    }) 

    return top_features;
}

process.on('message', async(data) => {
    try {
        const result = await train(data);
        console.log('on message', result);
        if ( result.error ) {
            process.send(result);
        }
        else {
            process.send(data);
        }
    }
    catch(e) {
        process.send({err:e.toString()});
    }
});