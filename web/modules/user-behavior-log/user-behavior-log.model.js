const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userBehaviorLogSchema = new Schema({
  session: String,
  uuid: String,
  accountKey: String,
  pathname: String,
  domain: String,
  utmMedium: String,
  utmSource: String,
  utmCampaign: String,
  referrer: String,
  userAgent: String,
  browser: Object,
  engine: Object,
  device: Object,
  os: Object,
  time: Object,
  ip: Object,
  cpu: Object,
  type: Number,
  isPrivateBrowsing: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now()}
});

const UserBehaviorLogSchema = mongoose.model('UserBehaviorLog', userBehaviorLogSchema, 'UserBehaviorLogs');
module.exports = UserBehaviorLogSchema;
module.exports.Model = userBehaviorLogSchema;

