const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userBehaviorLogSchema = new Schema({
  session: String,
  uuid: String,
  accountKey: String,
  pathname: String,
  domain: String,
  browserResolution: {
    width: Number,
    height: Number
  },
  screenResolution: {
    width: Number,
    height: Number
  },
  location: {
    longitude: Number,
    latitude: Number,
    country_code: String,
    country_name: String,
    city: String,
    postal: String,
    state: String
  },
  keyword: String,
  utmMedium: String,
  utmSource: String,
  utmCampaign: String,
  gclid: String,
  referrer: String,
  href: String,
  userAgent: String,
  browser: Object,
  engine: Object,
  device: Object,
  os: Object,
  time: Object,
  ip: Object,
  localIp: String,
  cpu: Object,
  type: Number,
  networkCompany: {
    name: String,
    value: Number
  },
  isPrivateBrowsing: {type: Boolean, default: false},
  isSpam: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now()},
  trafficSource: Number
});

const UserBehaviorLogSchema = mongoose.model('UserBehaviorLog', userBehaviorLogSchema, 'UserBehaviorLogs');
module.exports = UserBehaviorLogSchema;
module.exports.Model = userBehaviorLogSchema;

