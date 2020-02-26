const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trackingsSchema = new Schema({
  info: {type: Object, default: null}
}, { timestamps: true });

const trackingsModel = mongoose.model('Tracking', trackingsSchema, 'Trackings');

module.exports = trackingsModel;
module.exports.Model = trackingsSchema;

