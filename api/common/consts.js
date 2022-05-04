class TrainingStatus {
    static NotExisting = new TrainingStatus("not_existing")
    static NotTrained = new TrainingStatus("not_trained")
    static Pending = new TrainingStatus("pending")
    static Trained = new TrainingStatus("trained")
    static Failed = new TrainingStatus("failed")

    constructor(name) {
        this.name = name
    }
}

module.exports = {
    TrainingStatus
}