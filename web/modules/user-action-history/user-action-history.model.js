const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const userActionHistorySchema = new Schema({
  userId: ObjectId,
  content: String,
  param: Object
}, { timestamps: true });

const UserActionHistorySchema = mongoose.model('UserActionHistory', userActionHistorySchema, 'UserActionHistories');
module.exports = UserActionHistorySchema;
module.exports.Model = userActionHistorySchema;

