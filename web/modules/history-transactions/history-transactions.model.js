const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const historyTransactionsSchema = new Schema({
  package: ObjectId,
  code: String,
  price: Number
}, { timestamps: true });

const historyTransactionsModel = mongoose.model('HistoryTransaction', historyTransactionsSchema, 'HistoryTransactions');
module.exports = historyTransactionsModel;
module.exports.Model = historyTransactionsSchema;

