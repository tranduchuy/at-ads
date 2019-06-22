const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notifySchema = new Schema({
  fromUser: Number,
  type: Number,
  params: Object,
  toUser: Number,
  status: {
    type: Number,
    default: global.STATUS.NOTIFY_NONE
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  createdTime: Date,
  updatedTime: Date
});

const NotifyModel = mongoose.model('Notifies', notifySchema, 'Notifies');
module.exports = NotifyModel;
module.exports.Model = notifySchema;