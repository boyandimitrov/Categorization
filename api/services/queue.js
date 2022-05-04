const queue = require('queue');


let QueueService = class {
    constructor() {
        this.q = queue({concurrency:3, autostart: true})
    }

    init () {
        this.q.on('success', function (result, job) {
            //console.log('job finished processing:', job.toString().replace(/\n/g, ''))
            console.log('job finished processing:')
        })
    }

    add_task (func, ...theArgs) {
        this.q.push(async function(cb) {
            console.log('execute task', func, theArgs);
            const result = await func(...theArgs);
            cb(result);
        })
    }
}

module.exports = {
    creator : new QueueService()
}