const mongoose = require('mongoose');
const { TOPIC } = require('./fire-base-tokens.constant');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const fireBaseTokensSchema = new Schema({
    accountId: {type: ObjectId, default: null},
    token: String,
    topic: {type: Array, default: [TOPIC.home]}
}, { timestamps: true });

const FireBaseTokensModel = mongoose.model('FireBaseTokens', fireBaseTokensSchema, 'FireBaseTokens');
module.exports = FireBaseTokensModel;
module.exports.Model = fireBaseTokensSchema;

