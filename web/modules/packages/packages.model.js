const mongoose = require('mongoose');
const packagesService = require('./packages.service');
const Schema = mongoose.Schema;

const packagesSchema = new Schema({
  name: String,
  type: String,
  numOfDays: Number,
  price: Number
}, { timestamps: true });

const packagesModel = mongoose.model('Package', packagesSchema, 'Packages');

packagesService.initPackages(packagesModel);

module.exports = packagesModel;
module.exports.Model = packagesSchema;

