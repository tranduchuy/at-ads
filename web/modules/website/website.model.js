const mongoose = require('mongoose');
const WebsiteConstant = require('./website.constant');
const Schema = mongoose.Schema;
const websiteSchema = new Schema({
  code: { type : String , unique : true, required : true, dropDups: true },
  status: { type: Number, default: WebsiteConstant.status},
  domain: String,
  accountId: String,
  expiredAt: { type: Date, default: WebsiteConstant.expiredAt}

}, { timestamps: true });

const WebsiteModel = mongoose.model('Website', websiteSchema, 'Websites');
module.exports = WebsiteModel;
module.exports.Model = websiteSchema;

