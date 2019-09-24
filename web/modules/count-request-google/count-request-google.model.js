const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const countRequestGoogleSchema = new Schema({
    date       : { type: String, unique: true, required: true },
    count      : { type: Number, default: 0 },
    countReport: { type: Number, default: 0 },
}, { timestamps: true });

const countRequestGoogleModel = mongoose.model('CountRequestGoogle', countRequestGoogleSchema, 'CountRequestGoogle');
module.exports = countRequestGoogleModel;
module.exports.Model = countRequestGoogleSchema;