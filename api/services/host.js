const queue_service = require('./queue').creator;
const db_service = require('./db').creator;

hosts = {};

let ServiceHost = class {
    constructor() {
        this.queue_service = queue_service;
        this.db_service = db_service;
    }

    async init(context={}) {
        this.queue_service.init();
        await this.db_service.init(context.db || null);
    }
}

module.exports = {
    register : (key, context) => {
        if ( !hosts[key]) {
            hosts[key] = new ServiceHost()
            hosts[key].init(context);
        }
    },
    get_host : (key) => {
        return hosts[key];
    }
}