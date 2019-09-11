const mongoose = require('mongoose');
const packagesService = require('./packages.service');
const Schema = mongoose.Schema;

const packagesSchema = new Schema({
  name: String,
  numOfDays: Number,
  price: Number
}, { timestamps: true });

const packagesModel = mongoose.model('Package', packagesSchema, 'Packages');

packagesService.checkPackegesTableAndInsertData(packagesModel);

module.exports = packagesModel;
module.exports.Model = packagesSchema;

