const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const userBehaviorLogSchema = new Schema({
  session: {type: ObjectId, default: null},
  uuid: {type: String, default: null},
  accountKey: {type: String, default: null},
  pathname: {type: String, default: null},
  domain: {type: String, default: null},
  browserResolution: {
    width: {type: Number, default: null},
    height: {type: Number, default: null}
  },
  screenResolution: {
    width: {type: Number, default: null},
    height: {type: Number, default: null}
  },
  location: {
    longitude: {type: Number, default: null},
    latitude: {type: Number, default: null},
    country_code: {type: String, default: null},
    country_name: {type: String, default: null},
    city: {type: String, default: null},
    postal: {type: String, default: null},
    state: {type: String, default: null}
  },
  keyword: {type: String, default: null},
  matchType : {type: String, default: null},
  page: {type: String, default: null},
  position: {type: String, default: null},
  campaignType: {type: String, default: null},
  campaignId: {type: String, default: null},
  utmMedium: {type: String, default: null},
  utmSource: {type: String, default: null},
  utmCampaign: {type: String, default: null},
  gclid: {type: String, default: null},
  referrer: {type: String, default: null},
  href: {type: String, default: null},
  userAgent: {type: String, default: null},
  browser: {type: Object, default: null},
  engine: {type: Object, default: null},
  device: {type: Object, default: null},
  os: {type: Object, default: null},
  time: {type: Object, default: null},
  ip: {type: Object, default: null},
  localIp: {type: String, default: null},
  cpu: {type: Object, default: null},
  type: {type: Number, default: null},
  networkCompany: {
    name: {type: String, default: null},
    value: {type: Number, default: null}
  },
  isPrivateBrowsing: {type: Boolean, default: false},
  isSpam: {type: Boolean, default: false},
  trafficSource: {type: Number, default: null},
  reason: {type: Object, default: null},
  timeUnLoad: {type: Date, default: null},
  timeOnPage: {
    type: Number,
    default: null
  }, // in milliseconds
  scrollPercentage: {type: Number, default: 0},
  msisdn: {type: String, default: null}
}, { timestamps: true });

const UserBehaviorLogSchema = mongoose.model('UserBehaviorLog', userBehaviorLogSchema, 'UserBehaviorLogs');
module.exports = UserBehaviorLogSchema;
module.exports.Model = userBehaviorLogSchema;

