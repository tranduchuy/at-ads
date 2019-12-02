const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const userBehaviorLogSchema = new Schema({
  session: ObjectId,
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
  matchType : String,
  page: String,
  position: String,
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
  trafficSource: Number,
  reason: Object,
  timeUnLoad: Date,
  timeOnPage: {
    type: Number,
    default: null
  }, // in milliseconds
  scrollPercentage: {type: Number, default: 0}
}, { timestamps: true });

const UserBehaviorLogSchema = mongoose.model('UserBehaviorLog', userBehaviorLogSchema, 'UserBehaviorLogs');
module.exports = UserBehaviorLogSchema;
module.exports.Model = userBehaviorLogSchema;

