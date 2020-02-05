const mongoose = require('mongoose');
const WebsiteConstant = require('./website.constant');
const StatusConstant = require('../../constants/status');
const Schema = mongoose.Schema;
const websiteSchema = new Schema({
  code: { type : String , unique : true, required : true, dropDups: true },
  status: { type: Number, default: StatusConstant.Status.ACTIVE},
  domain: {type: String},
  accountAd: Schema.Types.ObjectId,
  isTracking: { type: Boolean, default: false },
  isValid: { type: Boolean, default: false },
  isDuplicateScript: { type: Boolean, default: false },
  popupConfig: { 
    themeColor : {type: String, default: WebsiteConstant.popupConfig.themeColor},
    popupPosition: {type: Number, default: WebsiteConstant.popupConfig.popupPosition},
    autoShowPopupRepeatTime: {type: Number, default: WebsiteConstant.popupConfig.autoShowPopupRepeatTime},
    autoShowPopup: {type: Boolean, default: WebsiteConstant.popupConfig.autoShowPopup},
		supporter : {
			name : {type: String, default: WebsiteConstant.popupConfig.supporter.name},
			avatar : {type: String, default: WebsiteConstant.popupConfig.supporter.avatar},
			major : {type: String, default: WebsiteConstant.popupConfig.supporter.major},
			phone : {type: String, default: WebsiteConstant.popupConfig.supporter.phone}
		}
  },
  isPopupOpening: { type: Boolean, default: false },
  fakeCustomerConfig: {
    isEnable: { type: Boolean, default: WebsiteConstant.fakeCustomerConfig.isEnable },
    runningDevices: { type: Array, default: WebsiteConstant.fakeCustomerConfig.runningDevices },
    positionOnPage: { type: Number, default: WebsiteConstant.fakeCustomerConfig.positionOnPage },
    autoDisplayTime: { type: Array, default: WebsiteConstant.fakeCustomerConfig.autoDisplayTime },
    avatarType: { type: Number, default: WebsiteConstant.fakeCustomerConfig.avatarType },
    title: { type: String, default: WebsiteConstant.fakeCustomerConfig.title },
    body: { type: String, default: WebsiteConstant.fakeCustomerConfig.body },
    pageUrl: { type: String, default: WebsiteConstant.fakeCustomerConfig.pageUrl },
    themeColor: { type: String, default: WebsiteConstant.fakeCustomerConfig.themeColor },
    shape: { type: Number, default: WebsiteConstant.fakeCustomerConfig.shape },
  },
}, { timestamps: true });

const WebsiteModel = mongoose.model('Website', websiteSchema, 'Websites');
module.exports = WebsiteModel;
module.exports.Model = websiteSchema;

