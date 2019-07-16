const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');

module.exports = async(req, res, next) => {
    try{
        const {accountId} = req.params;
        const adsAccount = await AccountAdsModel.findOne({_id: accountId, user: req.user._id});

        if(adsAccount)
        {
            req.adsAccount = adsAccount; 
            next();
        }
        else
        {
            return res.status(HttpStatus.NOT_FOUND).json({messages: ['Không tìm thấy tài khoản adwords']})
        }
    }
    catch(e)
    {
        logger.error('Middlewares::account-id::error ', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Lỗi không xác định']
        })
    }
}