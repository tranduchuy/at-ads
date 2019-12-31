const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const customerInfomationsSchema = new Schema(
  {
    uuid: { type: String, unique: true },
    customerInfo: { type: Array, default: [] },
    key: { type: String, default: null }
  },
  { timestamps: true }
);

const CustomerInfomationsModel = mongoose.model(
  'CustomerInfomation',
  customerInfomationsSchema,
  'CustomerInfomations'
);
module.exports = CustomerInfomationsModel;
module.exports.Model = customerInfomationsSchema;