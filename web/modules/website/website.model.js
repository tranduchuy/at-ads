const mongoose = require('mongoose');
const WebsiteConstant = require('./website.constant');
const StatusConstant = require('../../constants/status');
const Schema = mongoose.Schema;
const websiteSchema = new Schema({
  code: { type : String , unique : true, required : true, dropDups: true },
  status: { type: Number, default: StatusConstant.Status.ACTIVE},
  domain: {type: String, unique: true},
  accountAd: Schema.Types.ObjectId,
  isTracking: { type: Boolean, default: false },
  isValid: { type: Boolean, default: false },
  isDuplicateScript: { type: Boolean, default: false }
}, { timestamps: true });

const WebsiteModel = mongoose.model('Website', websiteSchema, 'Websites');
module.exports = WebsiteModel;
module.exports.Model = websiteSchema;

