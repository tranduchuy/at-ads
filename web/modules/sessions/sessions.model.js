const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const blockingCriterionsSchema = new Schema({
    accountId: String,
    campaignId: String,
    sampleBlockingIp: {type: Object, default: null},
    customBlackList: {type: Array, default: []}
}, { timestamps: true });

const SessionsModel = mongoose.model('BlockingCriterions', blockingCriterionsSchema, 'BlockingCriterions');
module.exports = SessionsModel;
module.exports.Model = blockingCriterionsSchema;

