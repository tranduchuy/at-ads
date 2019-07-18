const BlockingCriterions = require('../modules/blocking-criterions/blocking-criterions.model');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Middleware');

module.exports = async(req, res, next) => {
    logger.info('Middlewares::check-empty-campaign is called');
    try{
        const result = await BlockingCriterions.find({accountId: req.adsAccount._id});

        if(!result || result.length === 0)
        {
            return res.status(HttpStatus.NOT_FOUND).json({
                messages: ["Tài khoản hiện chưa có chiến dịch"]
            });
        }
        
        let campaignIdArr = [];
        
        result.forEach(campaign => {
            campaignIdArr.push(campaign.campaignId);            
        });

        req.campaignIds = campaignIdArr;

        logger.info('Middlewares::check-empty-campaign::success');
        return next();
    }
    catch(e)
    {
        logger.error('Middlewares::check-empty-campaign::error ', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Lỗi không xác định']
        })
    }
}