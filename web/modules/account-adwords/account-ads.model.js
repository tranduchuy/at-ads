const mongoose = require('mongoose');
const AccountAdsConstant = require('./account-ads.constant');
const Schema = mongoose.Schema;
const accountAdsSchema = new Schema({
    user: String,
    adsId: String,
    setting: {
        autoBlockByMaxClick: { type: Number, default: AccountAdsConstant.setting.autoBlockByMaxClick },
        autoRemoveBlocking: { type: Boolean, default: AccountAdsConstant.setting.autoRemoveBlocking },
        autoBlackListIp: { type: Array, default: AccountAdsConstant.setting.autoBlackListIp },
        autoBlackListIpRanges: { type: Array, default: AccountAdsConstant.setting.autoBlackListIpRanges },
        customBackList: { type: Array, default: AccountAdsConstant.setting.customBackList },
        mobileNetworks: {
            viettel: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.viettel },
            mobifone: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.mobifone },
            vinafone: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.vinafone },
            vietnammobile: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.vietnammobile },
        },
        devices: {
            mobile: { type: Boolean, default: AccountAdsConstant.setting.devices.mobile },
            tablet: { type: Boolean, default: AccountAdsConstant.setting.devices.tablet },
            pc: { type: Boolean, default: AccountAdsConstant.setting.devices.pc },
        }
    }
}, { timestamps: true });

const AccountAdsModel = mongoose.model('AccountAds', accountAdsSchema, 'AccountAds');
module.exports = AccountAdsModel;
module.exports.Model = accountAdsSchema;

