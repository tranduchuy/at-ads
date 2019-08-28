const mongoose = require('mongoose');
const { TOPIC } = require('./fire-base-tokens.constant');
const Schema = mongoose.Schema;
const fireBaseTokensSchema = new Schema({
    token: String,
    topic: {type: Array, default: [TOPIC.home]}
}, { timestamps: true });

const FireBaseTokensModel = mongoose.model('FireBaseTokens', fireBaseTokensSchema, 'FireBaseTokens');
module.exports = FireBaseTokensModel;
module.exports.Model = fireBaseTokensSchema;

