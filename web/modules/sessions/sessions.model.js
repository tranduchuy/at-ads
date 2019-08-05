const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sessionsSchema = new Schema({
    ip: String,
    uuid: String,
    accountKey: String,
    lastHitAt: {type: Date},
    createdAt: {type: Date, default: Date()},
    endedAt: {type: Date}
});

const SessionsModel = mongoose.model('Sessions', sessionsSchema, 'Sessions');
module.exports = SessionsModel;
module.exports.Model = sessionsSchema;

