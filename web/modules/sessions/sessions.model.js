const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sessionsSchema = new Schema({
    ip: String,
    uuid: String,
    accountKey: String,
    lastHitAt: {type: Date},
    endedAt: {type: Date}
},  { timestamps: true });

const SessionsModel = mongoose.model('Sessions', sessionsSchema, 'Sessions');
module.exports = SessionsModel;
module.exports.Model = sessionsSchema;

