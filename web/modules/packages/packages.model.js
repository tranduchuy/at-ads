const mongoose = require('mongoose');
const packagesService = require('./packages.service');
const Schema = mongoose.Schema;
const PackageConstant = require('./packages.constant');

const packagesSchema = new Schema({
  name: String,
  type: String,
  numOfMonths: Number,
  price: Number,
  interests: Array,
  isContactPrice: { type: Boolean, default: false },
  discountMonths: {type: Array, default: PackageConstant.discountArray}
}, { timestamps: true });

const packagesModel = mongoose.model('Package', packagesSchema, 'Packages');

packagesService.initPackages(packagesModel);

module.exports = packagesModel;
module.exports.Model = packagesSchema;

