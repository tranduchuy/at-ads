/**
 * Created by duong_000 on 10/18/2016.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tokenSchema = new Schema({
    user: String,
    token: String,
    date : Date
});

const TokenModel = mongoose.model('Token', tokenSchema, 'Tokens');
module.exports = TokenModel;