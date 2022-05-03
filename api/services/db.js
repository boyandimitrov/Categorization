const db_creator = require("../db/db").creator;

const TENANT = "tenants";
const DOMAIN = "domain";
const TRAINING_DATA = "training_data";

const config = {
    "host"             : process.env.MONGO_HOST,
    "port"             : process.env.MONGO_PORT,
    "database"         : process.env.MONGO_DB,
    "user"             : process.env.MONGO_USER,
    "password"         : process.env.MONGO_PASS,
    "options" : {
      "socketTimeoutMS"  : 60000,
      "connectTimeoutMS" : 6000
    }
}

let DBService = class {
    async init(cfg) {
        cfg = cfg || config;
        this.db = db_creator(cfg);
        await this.db.connect(cfg);

        const indexes = [
            {name : TENANT, index : {unique_id:1}},
            {name : DOMAIN, index : {unique_id:1, domain:1}},
            {name : TRAINING_DATA, index : {unique_id:1, domain:1}}
        ]
        await this.db.create_indexes(indexes);
    }

    async create_tenant (data) {
        await this.db.create(TENANT, data)
    }

    async get_tenant (data) {
        let params = {
            body : {
                unique_id : data.unique_id
            }
        };

        return await this.db.read_one(TENANT, params);
    }

    async get_domain (data) {
        let params = {
            body : {
                unique_id : data.unique_id,
                domain : data.domain
            }
        };

        return await this.db.read_one(DOMAIN, params);
    };

    async index_domain (data) {
        let domain = await this.get_domain(data);
        
        let update = {};
        if ( domain ) {
            update._id = domain._id;
        }
        else {
            let tenant = await this.get_tenant(data);

            if ( !tenant ) {
                throw 'Tenant is not registered!';
            }

            update = {
                domain : data.domain,
                tid : tenant._id,
                unique_id : tenant.unique_id,
                tenant_name : tenant.human_readable
            }
        }

        if ( data.options ) {
            update.options = data.options;
        }

        if ( data.boosts ) {
            update.boosts = data.boosts;
        }

        return await this.db.index(DOMAIN, update);
    };

    async add_training_data (domain, data) {
        let update = {};
        update.tid = domain.tid;
        update.did = domain._id;

        let document = Object.assign({}, update, data);

        return await this.db.insert(TRAINING_DATA, document);
    };

    async get_training_data (data) {
        let params = {
            body : {
                unique_id : data.unique_id,
                domain : data.domain
            },
            limit : 1
        };

        return await this.db.read_all(TRAINING_DATA, params);
    };

    async update_post_train_domain(domain, json) {
        let set_update = json;

        return await this.db.update(DOMAIN, domain._id, set_update);
    }
}

module.exports = {
    creator : new DBService()
}
