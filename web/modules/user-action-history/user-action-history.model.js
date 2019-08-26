const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userActionHistorySchema = new Schema({
  userId: String,
  content: String,
  param: Object,
  createdAt: {type: Date, default: Date.now()}
});

const UserActionHistorySchema = mongoose.model('UserActionHistory', userActionHistorySchema, 'UserActionHistories');
module.exports = UserActionHistorySchema;
module.exports.Model = userActionHistorySchema;

