const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const HttpStatus = require('http-status-codes');

module.exports = (req, res, next) => {
    if(!req.adsAccount.campaignIds || req.adsAccount.campaignIds.length === 0)
    {
        return res.status(HttpStatus.NOT_FOUND).json({messages: ["Tài khoản hiện chưa có chiến dịch"]})
    }
    else
    {
        next();
    }
}