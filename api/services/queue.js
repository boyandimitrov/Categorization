const queue = require('queue');


let QueueService = class {
    constructor() {
        this.q = queue({concurrency:3, autostart: true})
    }

    init () {
        this.q.on('success', function (result, job) {
            console.log('job finished processing:', job.toString().replace(/\n/g, ''))
            console.log('The result is:', result)
        })
    }

    add_task(func, ...theArgs) {
        this.q.push(async function(cb) {
            console.log('execute task');
            const result = await func(...theArgs);
            console.log('opa', result)
            cb(null, result);
        })
    }
}

module.exports = {
    creator : new QueueService()
}