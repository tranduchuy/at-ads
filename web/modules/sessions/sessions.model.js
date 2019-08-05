const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const sessionsSchema = new Schema({
    ip: String,
    createdAt: {type: Date, default: Date()},
    endedAt: {type: Date}
});

const SessionsModel = mongoose.model('Sessions', sessionsSchema, 'Sessions');
module.exports = SessionsModel;
module.exports.Model = sessionsSchema;

