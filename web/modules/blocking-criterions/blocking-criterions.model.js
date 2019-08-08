const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const blockingCriterionsSchema = new Schema({
    accountId: String,
    campaignId: String,
    isDeleted: {type: Boolean, default: false},
    sampleBlockingIp: {type: Object, default: null},
    customBlackList: {type: Array, default: []},
    autoBlackListIp: {type: Array, default: []}
}, { timestamps: true });

const BlockingCriterionsModel = mongoose.model('BlockingCriterions', blockingCriterionsSchema, 'BlockingCriterions');
module.exports = BlockingCriterionsModel;
module.exports.Model = blockingCriterionsSchema;

