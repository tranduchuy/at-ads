const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');

const UserConstant = require('../user/user.constant.js');
const UserModel = require('../user/user.model.js');
const AdsWordsModel = require('../account-adwords/account-ads.model.js');
const WebsiteModel = require('../website/website.model.js');

const statistic = async(req, res, next) => {
  logger.info('AdminController::statistic::Is called');
  try{
    const users = await UserModel.find({role: UserConstant.role.endUser});
    const userIds = users.map(user => user._id);
    const adswords = await AdsWordsModel.find({user: {$in : userIds}});
    const adsIds = adswords.map(ads => ads._id);
    const numberOfWebsite = await WebsiteModel.countDocuments({accountAd: {$in: adsIds}});
    return res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        numberOfUser: users.length,
        numberOfAdswords: adswords.length,
        numberOfWebsite
      }
    });
  }catch(e){
    logger.error('AdminController::statistic::error', e);
    next(e);
  }
}

module.exports = {
  statistic
}