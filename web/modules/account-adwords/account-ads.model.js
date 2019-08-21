const mongoose = require('mongoose');
const AccountAdsConstant = require('./account-ads.constant');
const Schema = mongoose.Schema;
const accountAdsSchema = new Schema({
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User'
    },
    adsId: { type: String, unique: true },
    key: String,
    isConnected: {type: Boolean, default: AccountAdsConstant.isConnected},
    isDeleted: {type: Boolean, default: false},
    setting: {
        autoBlockByMaxClick: { type: Number, default: AccountAdsConstant.setting.autoBlockByMaxClick },
        autoRemoveBlocking: { type: Boolean, default: AccountAdsConstant.setting.autoRemoveBlocking },
        autoBlackListIp: { type: Array, default: AccountAdsConstant.setting.autoBlackListIp },
        autoBlackListIpRanges: {
            classC: {type: Boolean, default: AccountAdsConstant.setting.autoBlackListIpRanges},
            classD: {type: Boolean, default: AccountAdsConstant.setting.autoBlackListIpRanges},  
        },
        customBlackList: { type: Array, default: AccountAdsConstant.setting.customBlackList },
        mobileNetworks: {
            viettel: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.viettel },
            mobifone: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.mobifone },
            vinafone: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.vinafone },
            vietnammobile: { type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.vietnammobile },
            fpt: {type: Boolean, default: AccountAdsConstant.setting.mobileNetworks.fpt}
        },
        sampleBlockingIp: {type: String, default: AccountAdsConstant.setting.sampleBlockingIp},
        devices: {
            computer: {type: Boolean, default: null},
            tablet: {type: Boolean, default: null},
            mobile: {type: Boolean, default: null}
        },
        blockByPrivateBrowser: {
            type: Boolean, default: false
        }
    }
}, { timestamps: true });

const AccountAdsModel = mongoose.model('AccountAds', accountAdsSchema, 'AccountAds');
module.exports = AccountAdsModel;
module.exports.Model = accountAdsSchema;

