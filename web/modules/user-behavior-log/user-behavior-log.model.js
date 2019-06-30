const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userBehaviorLogSchema = new Schema({
  pathname: String,
  domain: String,
  utmMedium: String,
  utmSource: String,
  utmCampaign: String,
  referrer: {type: String, required: true},
  userAgent: String,
  browser: Object,
  engine: Object,
  device: Object,
  os: Object,
  time: Object,
  ip: Object,
  cpu: Object,
  createdAt: {type: Date, default: Date.now()}
});

const UserBehaviorLogSchema = mongoose.model('UserBehaviorLog', userBehaviorLogSchema, 'UserBehaviorLogs');
module.exports = UserBehaviorLogSchema;
module.exports.Model = userBehaviorLogSchema;

