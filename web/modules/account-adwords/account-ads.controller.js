const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const AccountAdsModel = require('./account-ads.model');
const messages = require("../../constants/messages");
const ActionConstant = require('../../constants/action.constant');
const AccountAdsService = require("./account-ads.service");
const requestUtil = require('../../utils/RequestUtil');
const { AddAccountAdsValidationSchema } = require('./validations/add-account-ads.schema');
const { blockIpsValidationSchema} = require('./validations/blockIps-account-ads.schema');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const async = require('async');

const addAccountAds = async (req, res, next) => {
  logger.info('AccountAdsController::addAccountAds is called');
  try {
    const { error } = Joi.validate(req.body, AddAccountAdsValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { adWordId } = req.body;
    const { _id } = req.user;
    const duplicateAdWordId = await AccountAdsModel.find({ adsId: adWordId, user: _id });
    if (duplicateAdWordId.length !== 0) {
      const result = {
        messages: [messages.ResponseMessages.AccountAds.Register.ACCOUNT_ADS_DUPLICATE],
        data: {}
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }

    GoogleAdwordsService.sendManagerRequest(adWordId)
      .then(async result => {
        if (!result || !result.links) {
          logger.error('AccountAdsController::addAccountAds::error', JSON.stringify(result));

          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Gửi request quản lý tài khoản adword không thành công']
          });
        }

        await AccountAdsService.createAccountAds({userId: _id, adsId: adWordId });
        logger.info('AccountAdsController::addAccountAds::success', JSON.stringify(result));
        return res.status(HttpStatus.OK).json({
          messages: ['Đã gửi request đến tài khoản adwords của bạn, vui lòng truy cập và chấp nhập'],
          data: {}
        });
      })
      .catch(error => {
        const message = GoogleAdwordsService.mapManageCustomerErrorMessage(error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: [message]
        });
      });
  } catch (e) {
    logger.error('AccountAdsController::addAccountAds::error', JSON.stringify(e));
    return next(e);
  }
};

const handleManipulationGoogleAds = async(req, res, next) => {
  logger.info('AccountAdsController::handleManipulationGoogleAds is called');
  try{

    const { error } = Joi.validate(Object.assign({}, req.body), blockIpsValidationSchema);
    const {action, ips} = req.body;

    if (error) {
       return requestUtil.joiValidationResponse(error, res);
    }

    //block ips
    if(action === ActionConstant.ADD)
    {
      const ipsArr = AccountAdsService.detectIpsShouldBeUpdated(req.adsAccount.setting.customBackList, ips);

      if(!ipsArr || ipsArr.length === 0)
      {
        return res.status(HttpStatus.BAD_REQUEST).json({
          messages: ['Ip đã có trong backlist.']
        });
      }

      const campaignIds = req.adsAccount.campaignIds || [];

      async.eachSeries(campaignIds, (campaignId, callback)=>{
        AccountAdsService.addIpsToBlackListOfOneCampaign(req.adsAccount.adsId, campaignId, ipsArr, callback);
      },err => {
        if(err)
        {
          logger.info('AccountAdsController::handleManipulationGoogleAds::error', JSON.stringify(logData));
        }
      });

      const queryUpdate = {'adsId': req.adsAccount.adsId};
      const updateingData = {
        $push: {
          'setting.customBackList': {$each: ipsArr}
        }
      };
      AccountAdsModel
        .update(queryUpdate, updateingData)
        .exec((err)=>{
          if(err)
          {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              messages: ['Thêm ips vào backlist không thành công.']
            });
          }

          return res.status(HttpStatus.OK).json({
            messages: ['Thêm ips vào backlist thành công.']
          });
      }); 
    }
    //remove ips to blacklist
    else
    {
      //TODO DELETE IPS BACKLIST
    }
  }
  catch(e)
  {
    console.log(e + '');
    logger.error('AccountAdsController::handleManipulationGoogleAds::error', JSON.stringify(e));
  }
};

const getAccountsAds = async (req, res, next) => {
  logger.info('AccountAdsController::getAccountsAds is called');
  try {
    const accounts = await AccountAdsService.getAccountsAdsByUserId(req.user._id);
    if (accounts !== null) {
      const response = {
        messages: [messages.ResponseMessages.SUCCESS],
        data: {
          accounts: accounts
        }
      };
      return res.status(HttpStatus.OK).json(response);
    }

    const response = {
      messages: [messages.ResponseMessages.AccountAds.ACCOUNT_NOT_FOUND],
      data: {}
    };
    return res.status(HttpStatus.NOT_FOUND).json(response);

  } catch (e) {
    logger.error('AccountAdsController::getAccountsAds::error', e);
    return next(e);
  }
};

module.exports = {
  addAccountAds,
  handleManipulationGoogleAds,
  getAccountsAds
};

