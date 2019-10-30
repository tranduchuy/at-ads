const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const orderTransactionsSchema = new Schema(
  {
    packageId: { type: ObjectId, default: null },
    userId: { type: ObjectId, default: null },
    code: { type: String, default: null, unique: true },
    status: { type: Number, default: null }
  },
  { timestamps: true }
);

const orderTransactionsModel = mongoose.model(
  'Order',
  orderTransactionsSchema,
  'Orders'
);
module.exports = orderTransactionsModel;
module.exports.Model = orderTransactionsSchema;