const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const AccountAdsModel = require('./account-ads.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const messages = require("../../constants/messages");
const ActionConstant = require('../../constants/action.constant');
const AccountAdsService = require("./account-ads.service");
const requestUtil = require('../../utils/RequestUtil');
const { AddAccountAdsValidationSchema } = require('./validations/add-account-ads.schema');
const { blockIpsValidationSchema} = require('./validations/blockIps-account-ads.schema');
const { AutoBlockingIpValidationSchema } = require('./validations/auto-blocking-ip.schema');
const { AutoBlocking3g4gValidationSchema } = require('./validations/auto-blocking-3g4g.schema');
const { AutoBlockingRangeIpValidationSchema } = require('./validations/auto-blocking-range-ip.schema');
const { AddCampaingsValidationSchema } = require('./validations/add-campaings-account-ads.chema');
const { sampleBlockingIpValidationSchema } = require('./validations/sample-blocking-ip.schema');
const { setUpCampaignsByOneDeviceValidationSchema } = require('./validations/set-up-campaign-by-one-device.schema');
const GoogleAdwordsService = require('../../services/GoogleAds.service');
const Async = require('async');
const _ = require('lodash');
const ManagerCustomerMsgs = require('../../constants/ManagerCustomerMsgs');
const moment = require('moment');

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
          logger.error('AccountAdsController::addAccountAds::error', result);

          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Gửi request quản lý tài khoản adword không thành công']
          });
        }

        await AccountAdsService.createAccountAds({userId: _id, adsId: adWordId });
        logger.info('AccountAdsController::addAccountAds::success', result);
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
    logger.error('AccountAdsController::addAccountAds::error', e);
    return next(e);
  }
};

const handleManipulationGoogleAds = async(req, res, next) => {
  logger.info('AccountAdsController::handleManipulationGoogleAds is called');
  try{

    const { error } = Joi.validate(req.body, blockIpsValidationSchema);
    const {action, ips} = req.body;

    if (error) {
       return requestUtil.joiValidationResponse(error, res);
    }

    const arrAfterRemoveIdenticalElement = ips.filter(AccountAdsService.onlyUnique);
    const campaignIds = req.campaignIds || [];

    //ADD IPS IN CUSTOMBLACKLIST
    if(action === ActionConstant.ADD)
    {
      logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + ' is called');
      const ipInSampleBlocked = req.adsAccount.setting.sampleBlockingIp;
      const ipsArr = AccountAdsService.checkIpIsBlackListed(req.adsAccount.setting.customBlackList, arrAfterRemoveIdenticalElement, ipInSampleBlocked);

      if(ipsArr.length !== 0)
      {
        logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::conflict');
        return res.status(HttpStatus.CONFLICT).json({
          messages: ['Ip đã có trong blacklist.'],
          data: {
            ips: ipsArr
          }
        });
      }

      Async.eachSeries(campaignIds, (campaignId, callback)=>{
        AccountAdsService.addIpsToBlackListOfOneCampaign(req.adsAccount._id, req.adsAccount.adsId, campaignId, arrAfterRemoveIdenticalElement, callback);
      },err => {
        if(err)
        {
          logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::error', err);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Thêm ips vào blacklist không thành công.']
          });
        }

        const newBlackList = req.adsAccount.setting.customBlackList.concat(arrAfterRemoveIdenticalElement);

        req.adsAccount.setting.customBlackList = newBlackList;

        req.adsAccount.save(err=>{
          if(err)
          {
            logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::error', err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              messages: ['Thêm ips vào blacklist không thành công.']
            });
          }
          logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::success');
          return res.status(HttpStatus.OK).json({
            messages: ['Thêm ips vào blacklist thành công.']
          });
        });

      });
    }
    //REMOVE IPS IN CUSTOMBLACKLIST
    else
    {
      logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + ' is called');
      const blackList = req.adsAccount.setting.customBlackList || [];
      
      const checkIpsInBlackList = AccountAdsService.checkIpIsNotOnTheBlackList(blackList, arrAfterRemoveIdenticalElement);

      if(checkIpsInBlackList.length !== 0)
      {
        logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::notFound');
        return res.status(HttpStatus.NOT_FOUND).json({
            messages: ['Ip không nằm trong blacklist.'],
            data :{
              ips: checkIpsInBlackList
            }
        });
      }

      Async.eachSeries(campaignIds, (campaignId, callback)=>{
        AccountAdsService.removeIpsToBlackListOfOneCampaign(req.adsAccount._id, req.adsAccount.adsId, campaignId, arrAfterRemoveIdenticalElement, callback);
      },err => {
        if(err)
        {
          logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::error', err);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Xóa ip không thành công.']
          });
        }

        const ipNotExistsInListArr = _.difference(blackList, arrAfterRemoveIdenticalElement);

        req.adsAccount.setting.customBlackList = ipNotExistsInListArr;
        req.adsAccount.save((err)=>{
          if(err)
          {
            logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::error', err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              messages: ['Xóa ip không thành công.']
            });
          }
          logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::success');
          return res.status(HttpStatus.OK).json({
            messages: ['Xóa ip thành công.']
          });
        });
      });
    }
  }
  catch(e)
  {
    logger.error('AccountAdsController::handleManipulationGoogleAds::error', e);
    return next(e);
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

const autoBlockIp = (req, res, next) => {
  logger.info('AccountAdsController::autoBlockIp is called');
  try{
    const { error } = Joi.validate(req.body, AutoBlockingIpValidationSchema);
   
    if (error) {
       return requestUtil.joiValidationResponse(error, res);
    }

    let {maxClick, autoRemove} = req.body;
    maxClick = Number(maxClick);

    if(maxClick == 0 || maxClick == -1)
    {
      req.adsAccount.setting.autoBlockByMaxClick = -1;
      req.adsAccount.setting.autoRemoveBlocking = false;
    }
    else
    {
      req.adsAccount.setting.autoBlockByMaxClick = maxClick;
      req.adsAccount.setting.autoRemoveBlocking = autoRemove;
    }

    req.adsAccount.save((err)=>{
      if(err)
      {
        logger.error('AccountAdsController::autoBlockingIp::error', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ["Thiết lập block ip tự động không thành công"]
        });
      }
      logger.info('AccountAdsController::autoBlockingIp::success');
      return res.status(HttpStatus.OK).json({
        messages: ["Thiết lập block ip tự động thành công"]
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::autoBlockingIp::error', e);
    return next(e);
  }
};

const autoBlockingRangeIp = (req, res, next) => {
  logger.info('AccountAdsController::autoBlockingRangeIp is called');
  try{
    const { error } = Joi.validate(req.body, AutoBlockingRangeIpValidationSchema);
   
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const {classC, classD} = req.body;
    const rangeIp = {classC, classD};

    req.adsAccount.setting.autoBlackListIpRanges = rangeIp;

    req.adsAccount.save((err)=>{
      if(err)
      {
        logger.error('AccountAdsController::autoBlockingRangeIp::error', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ["Thiết lập chặn ip theo nhóm không thành công"]
        });
      }
      logger.info('AccountAdsController::autoBlockingRangeIp::success');
      return res.status(HttpStatus.OK).json({
        messages: ["Thiết lập chặn ip theo nhóm thành công"]
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::autoBlockingRangeIp::error', e);
    return next(e);
  }
};

const autoBlocking3g4g = (req, res, next) => {
  logger.info('AccountAdsController::autoBlock3g4g is called');
  try{
    const { error } = Joi.validate(req.body, AutoBlocking3g4gValidationSchema);
   
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const {viettel, mobifone, vinafone, vietnammobile} = req.body;
    const mobiNetworks = {viettel, mobifone, vinafone, vietnammobile};

    req.adsAccount.setting.mobileNetworks = mobiNetworks;

    req.adsAccount.save((err)=>{
      if(err)
      {
        logger.error('AccountAdsController::autoBlocking3g4g::error', e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ["Thiết lập chặn ip theo 3G/4G không thành công"]
        });
      }
      logger.info('AccountAdsController::autoBlocking3g4g::success');
      return res.status(HttpStatus.OK).json({
        messages: ["Thiết lập chặn ip theo 3G/4G thành công"]
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::autoBlocking3g4g::error', e);
    return next(e);
  }
};

const addCampaignsForAAccountAds = async(req, res, next) => {
  logger.info('AccountAdsController::addCampaignsForAAccountAds is called');
  try{
    const { error } = Joi.validate(req.body, AddCampaingsValidationSchema);
   
    if (error) {
       return requestUtil.joiValidationResponse(error, res);
    }

    let {campaignIds} = req.body;
    campaignIds = campaignIds.map(String);
    const campaignIdsAfterRemoveIdenticalElement = campaignIds.filter(AccountAdsService.onlyUnique);

    const checkCampaignId =  await AccountAdsService.checkCampaign(req.adsAccount._id, campaignIdsAfterRemoveIdenticalElement);

    if(!checkCampaignId)
    {
      logger.info('AccountAdsController::addCampaignsForAAccountAds::error');
      return res.status(HttpStatus.CONFLICT).json({
        messages: ["Chiến dịch bị trùng"]
      });
    }

    const campaignsArr = AccountAdsService.createdCampaignArr(req.adsAccount._id, campaignIdsAfterRemoveIdenticalElement);

    BlockingCriterionsModel.insertMany(campaignsArr, (err)=>{
      if(err)
      {
        logger.error('AccountAdsController::addCampaignsForAAccountAds::error', err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ["Thêm chiến dịch không thành công"]
        });
      }
      logger.info('AccountAdsController::addCampaignsForAAccountAds::success');
      return res.status(HttpStatus.OK).json({
        messages: ["Thêm chiến dịch thành công"]
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::addCampaignsForAAccountAds::error', e);
    return next(e);
  }
};

const getListOriginalCampaigns = async(req, res, next) => {
  logger.info('AccountAdsController::getListOriginalCampaigns is called');
  try{
      const result = await GoogleAdwordsService.getListCampaigns(req.adsAccount.adsId);

      const processCampaignList = AccountAdsService.getIdAndNameCampaignInCampaignsList(result);

      logger.info('AccountAdsController::getListOriginalCampaigns::success');
      return res.status(HttpStatus.OK).json({
        messages: ["Lấy danh sách chiến dịch thành công."],
        data: {campaignList: processCampaignList}
      });
  }
  catch(e)
  {
    const message = GoogleAdwordsService.mapManageCustomerErrorMessage(e);
    logger.error('AccountAdsController::getOriginalCampaigns::error', e);
    return next(message);
  }
};

const connectionConfirmation = async(req, res, next) => {
  logger.info('AccountAdsController::connectionConfirmation is called');
  try{
    const { error } = Joi.validate(req.body, AddAccountAdsValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { adWordId } = req.body;

    GoogleAdwordsService.sendManagerRequest(adWordId)
    .then(async result => {
      const error = await AccountAdsService.createdAccountIfNotExists(req.user._id, adWordId);
      if(error)
      {
        logger.error('AccountAdsController::connectionConfirmation::error', error);
        return next(error);
      }

      logger.info('AccountAdsController::connectionConfirmation::success');
      return res.status(HttpStatus.OK).json({
        messages: ['Đã gửi request đến tài khoản adwords của bạn, vui lòng truy cập và chấp nhập'],
        data: {
          isConnected: false
        }
      }); 
    }).catch(async err => {
      const message = GoogleAdwordsService.mapManageCustomerErrorMessage(err);
      let isConnected = false;
      switch (message) {
        case ManagerCustomerMsgs.ALREADY_MANAGED_BY_THIS_MANAGER:
          isConnected = true;
          break;
        case ManagerCustomerMsgs.ALREADY_INVITED_BY_THIS_MANAGER:
          break;
        default:
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: [message]
          });
      }
      
      const error = await AccountAdsService.createdAccountIfNotExists(req.user._id, adWordId);
      if(error)
      {
        logger.error('AccountAdsController::connectionConfirmation::error', error);
        return next(error);
      }

      const queryUpdate = { adsId: adWordId };
      const updatingData = { isConnected };
      AccountAdsModel
        .updateMany(queryUpdate, updatingData)
        .exec(err => {
          if(err)
          {
            logger.error('AccountAdsController::connectionConfirmation::error', err);
            next(err);
          }
        });

      logger.info('AccountAdsController::connectionConfirmation::success');
      return res.status(HttpStatus.OK).json({
        messages: [message],
        data: {
          isConnected
        }
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::connectionConfirmation::error', e);
    return next(e);
  }
};

const getReportOnDevice = async(req, res, next) => {
  logger.info('AccountAdsController::getReportOnDevice is called');
  try{
    const campaigns = await BlockingCriterionsModel.find({'accountId': req.adsAccount._id })

    if(campaigns.length === 0)
    {
      logger.info('AccountAdsController::getReportOnDevice::success');
      return res.status(HttpStatus.OK).json({
        messages: 'Lấy report thành công',
        data:{
          reportDevice: []
        }
      });
    }

    const fields = ['Device', 'Cost', 'Impressions', 'Clicks', 'AveragePosition', 'CampaignId',  'CampaignDesktopBidModifier', 'CampaignMobileBidModifier', 'CampaignTabletBidModifier'];
    const campaignIds = campaigns.map(campaign => campaign.campaignId);
    const startDate = moment().subtract(1, 'months').format('MM/DD/YYYY');
    const endDate = moment().format('MM/DD/YYYY');

    GoogleAdwordsService.getReportOnDevice(req.adsAccount.adsId, campaignIds, fields, startDate, endDate)
    .then(result => {
      const jsonArr = AccountAdsService.convertCSVToJSON(result);

      if(jsonArr.length === 0)
      {
        logger.info('AccountAdsController::getReportOnDevice::success');
        return res.status(HttpStatus.OK).json({
          messages: 'Lấy report thành công',
          data:{
            reportDevice: []
          }
        });
      }

      const reportDevice = AccountAdsService.reportTotalOnDevice(jsonArr);
      logger.info('AccountAdsController::getReportOnDevice::success');
      return res.status(HttpStatus.OK).json({
        messages: 'Lấy report thành công',
        data:{
          reportDevice
        }
      });
    }).catch(err => {
      logger.error('AccountAdsController::getReportOnDevice::error ', err);
      next(err);
    });
  }catch(e){
    logger.error('AccountAdsController::getReportOnDevice::error ', e);
    next(e);
  }
};

const setUpCampaignsByOneDevice = async(req, res, next) => {
  const info = { 
    userId: req.adsAccount.user,
    adsId: req.adsAccount.adsId,
    device: req.body.device,
    isEnabled: req.body.isEnabled
  };

  logger.info('AccountAdsController::setUpCampaignsByOneDevice is called\n', info);

  try{
    const { error } = Joi.validate(req.body, setUpCampaignsByOneDeviceValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { device, isEnabled } = req.body;
    const campaigns = await BlockingCriterionsModel.find({accountId: req.adsAccount._id});

    if(campaigns.length === 0)
    {
      logger.info('AccountAdsController::setUpCampaignsByOneDevice::accountNotCampaign\n', info);
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: ['Tài khoản chưa có chiến dịch để thiết lập.']
      });
    }

    const campaignIds = campaigns.map(campaign => campaign.campaignId);
    const adsId = req.adsAccount.adsId;
    let bidModify = isEnabled?1:0;

    Async.eachSeries(campaignIds, (campaignId, callback)=>{
      GoogleAdwordsService.enabledOrPauseTheCampaignByDevice( adsId, campaignId, device, bidModify)
      .then(result => {
        callback();
      }).catch(error => {
        logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', error, '\n', info);
        callback(error);
      });
    },err => {
      if(err)
      {
        logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', err, '\n', info);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ['Thiết lập không thành công.']
        });
      }
      logger.info('AccountAdsController::setUpCampaignsByOneDevice::success\n', info);
      return res.status(HttpStatus.OK).json({
        messages: ['Thiết lập thành công.']
      });
    });
  }
  catch(e)
  {
    logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', e, '\n', info);
    next(e);
  }
};

const blockSampleIp = (req, res, next) => {
  const info = { 
    userId: req.adsAccount.user,
    adsId: req.adsAccount.adsId,
    ip: req.body.ip
  };

  logger.info('AccountAdsController::blockSampleIp\n', info);
  try{
    const { error } = Joi.validate(req.body, sampleBlockingIpValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { ip } = req.body;
    const campaignIds = req.campaignIds || [];
    const adsId = req.adsAccount.adsId;
    const accountId= req.adsAccount._id;
    const checkIpInDB = req.adsAccount.setting.customBlackList.filter(ele => ele === ip);

    if(checkIpInDB.length !== 0)
    {
      logger.info('AccountAdsController::blockSampleIp::removeSampleBlockingIp::Conflict\n', info);
      return res.status(HttpStatus.CONFLICT).json({
        messages: ['ip đã có trong blacklist.'],
        data:{
          ips: checkIpInDB
        }
      });
    }

    Async.series([
      (cb) => {
        if(req.adsAccount.setting.sampleBlockingIp || req.adsAccount.setting.sampleBlockingIp !== '')
        {
          AccountAdsService.removeSampleBlockingIp(adsId, accountId, campaignIds)
          .then(result => {
            logger.info('AccountAdsController::blockSampleIp::removeSampleBlockingIp::success', info);
            cb(null);
          }).catch(err => {
            cb(err);
          });
        } else {
          cb();
        }
      }
    ], (err) => {
      if(err)
      {
          logger.error('AccountAdsController::blockSampleIp::removeSampleBlockingIp::error', err, '\n', info);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Thêm ip không thành công.']
          });
      }
      AccountAdsService.addSampleBlockingIp(adsId, accountId, campaignIds, ip)
      .then(result => {
        req.adsAccount.setting.sampleBlockingIp = ip;
        req.adsAccount.save(error=> {
          if(error)
          {
            logger.error('AccountAdsController::blockSampleIp::error', error, '\n', info);
              return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
              messages: ['Thêm ip không thành công.']
            });
          }
  
          logger.info('AccountAdsController::blockSampleIp::addSampleBlockingIp::success', info);
          return res.status(HttpStatus.OK).json({
            messages: ['Thêm ip thành công.']
          });
        });
      }).catch(err => {
        logger.error('AccountAdsController::blockSampleIp::addSampleBlockingIp::error', err, '\n', info);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          messages: ['Thêm ip không thành công.']
        });
      });
    });
  }catch(e){
    logger.error('AccountAdsController::blockSampleIp::error', e, '\n', info);
    next(e);
  }
};

const unblockSampleIp = (req, res, next) => {
  const info = { 
    userId: req.adsAccount.user,
    adsId: req.adsAccount.adsId,
    ip: req.body.ip
  };

  logger.info('AccountAdsController::unblockSampleIp is called\n', info);
  try{
    const { error } = Joi.validate(req.body, sampleBlockingIpValidationSchema);

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { ip } = req.body;

    if(req.adsAccount.setting.sampleBlockingIp !== ip || !req.adsAccount.setting.sampleBlockingIp)
    {
      logger.info('AccountAdsController::unblockSampleIp::notFound\n', info);
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Ip không nằm trong blackList.'],
        data: {
          ips: [ip]
        }
      });
    }

    const campaignIds = req.campaignIds || [];
    const adsId = req.adsAccount.adsId;
    const accountId= req.adsAccount._id; 

    AccountAdsService.removeSampleBlockingIp(adsId, accountId, campaignIds)
    .then(result => {
      req.adsAccount.setting.sampleBlockingIp = '';
      req.adsAccount.save(error=> {
        if(error)
        {
          logger.error('AccountAdsController::unblockSampleIp::error', error, '\n', info);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            messages: ['Xóa ip không thành công.']
          });
        }
        logger.info('AccountAdsController::unblockSampleIp::success\n', info);
          return res.status(HttpStatus.OK).json({
          messages: ['Xóa ip thành công.']
        });
      });
    }).catch(err => {
      logger.error('AccountAdsController::unblockSampleIp::error', err, '\n', info);
      next(err);
    });
  }catch(e){
    logger.error('AccountAdsController::unblockSampleIp::error', e, '\n', info);
    next(e);
  }
};

module.exports = {
  addAccountAds,
  handleManipulationGoogleAds,
  getAccountsAds,
  autoBlockIp,
  autoBlockingRangeIp,
  autoBlocking3g4g,
  addCampaignsForAAccountAds,
  getListOriginalCampaigns,
  connectionConfirmation,
  getReportOnDevice,
  setUpCampaignsByOneDevice,
  blockSampleIp,
  unblockSampleIp
};

