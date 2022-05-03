const mongo         = require("mongodb");

const errors        = require("../common/errors");

const MongoClient = mongo.MongoClient;
const ObjectID    = mongo.ObjectID;

const PAGE_SIZE = 100;

const S2OID = (sval) =>
{
    let result = null;

    if( typeof (sval) === "object" )
    {
        return sval;
    }

    try
    {
        if( sval )
            result = ObjectID.createFromHexString(sval);
    }
    catch( e )
    {
    }

    return result;
};

let MongoDB = class {

    constructor(test) {
        console.log(test);
    }

    getMongoConfig(config) {
        let user = "";
        let search_string = "";
        if ( config.user ) {
            user = `${config.user}:${config.password}@`;
            search_string = "?authSource=admin";
        }
        const configUrl = `mongodb://${user}${config.host}:${config.port}/${config.database}${search_string}`;

        const options =  config.options;
    
        options.useNewUrlParser = true;
        return [configUrl, config.database, options]
    }

    async connect (config) {
        try {
            let [uri, database, options] = this.getMongoConfig(config);
            this.mongoClient = new MongoClient(uri, options);
            this.db = this.mongoClient.db(database);
            console.log('Connecting to MongoDB Atlas cluster...');
            await this.mongoClient.connect();
            console.log('Successfully connected to MongoDB Atlas!');
    
            return this.mongoClient;
        } 
        catch (error) {
            console.error('Connection to MongoDB Atlas failed!', error);
            this.mongoClient = null;
            return errors.db_connection_failed('Connection to MongoDB Atlas failed!');
        }
    }

    async create_indexes (indexes) {
        indexes = indexes || [];
        indexes.forEach(({name, index}) => this.ensure_index(name, index));
    };

    async read_one (collection_name, params) {
        if ( params.body._id ) {
            params.body._id = S2OID(params.body._id) || params.body._id;
        }

        const collection = await this.db.collection(collection_name)
        return collection.findOne(params.body, params.projection || {});
    };

    async create (collection_name, data) {
        const collection = this.db.collection(collection_name);
    
        await collection.insertOne(data);
    }

    async index (collection_name, document) {
        let result;
        let id = document._id;
        delete document._id;

        if (id)
        {
            id = S2OID(id) || id;
            await this.db.collection(collection_name).updateOne({_id : id}, {$set : document}, {upsert: true})
            document._id = id;
            return document;
        }
        else
        {
            result = await this.db.collection(collection_name).insertOne(document);
            result = result.ops[0];
            return result;
        }
    };

    async insert (collection_name, document) {
        await this.db.collection(collection_name).insertOne(document);
    };

    async ensure_index (collection_name, index) {
        await this.db.collection(collection_name).createIndex(index);
    };

    async read (collection_name, params) {
        let limit = params.limit || PAGE_SIZE;
        let skip = ((params.page || 1) - 1) * limit;
        let result = [];
        if (params.sort) {
            result = await this.db.collection(collection_name).find(params.body, params.projection || {}).sort(params.sort).skip(skip).limit(limit).toArray();
        }
        else {
            result = await this.db.collection(collection_name).find(params.body, params.projection || {}).skip(skip).limit(limit).toArray();
        }

        return result;
    };

    async read_all (collection_name, params, results = [], last_seen = null) {
        let body = params.body || {};
        const limit = params.limit || 1000;

        if ( last_seen ) {
            body["_id"] = { "$gt": last_seen };
        }

        let docs = await this.db.collection(collection_name).find(
            body, 
            { "limit": limit, "sort": { "_id": 1}  },
        ).toArray();

        if ( !docs.length ) {
            return results;
        }

        results = results.concat(docs);
        //cb(docs);
        last_seen = docs[docs.length-1]._id;

        if ( docs.length < limit) {
            return results;
        }

        results = await this.read_all(collection_name, params, results, last_seen);
        return results;
    }

    async update (collection_name, _id, params) {
        let id = S2OID(_id) || _id;
    
        await this.db.collection(collection_name).updateOne({_id: id}, {$set :params}, {upsert:true})
    };    
}

module.exports = {
    creator : (cfg) => new MongoDB(cfg)
}