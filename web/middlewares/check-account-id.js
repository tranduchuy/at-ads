const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');

module.exports = async(req, res, next) => {
    logger.info('Middlewares::check-account-id is called');
    try{
        const {accountId} = req.params;
        const query = {
            _id: accountId,
            user: req.user._id,
            isDeleted: false
        };
        const adsAccount = await AccountAdsModel.findOne(query);

        if(adsAccount)
        {
            req.adsAccount = adsAccount;
            logger.info('Middlewares::check-account-id::success'); 
            return next();
        }
        return res.status(HttpStatus.NOT_FOUND).json({messages: ['Không tìm thấy tài khoản adwords']})
    }
    catch(e)
    {
        logger.error('Middlewares::check-account-id::error ', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Lỗi không xác định']
        })
    }
}
