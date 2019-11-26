const schedule = require('node-schedule');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const GoolgeAdsService = require('../services/GoogleAds.service');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeUpdateAdsName = config.get('appScheduleJobs').timeUpdateAdsName;
const AccountAdsConstant = require('../modules/account-adwords/account-ads.constant');

const updateAdsNameForAccount = (accountAds) => {
  logger.info('Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Is called.');
  try{
    Async.eachSeries(accountAds, (account, callback) => {
      if(!account.isConnected && account.connectType == AccountAdsConstant.connectType.byId)
      {
        logger.info(`Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Account ${account.adsId} not accepted management.`);
        return callback();
      }

      logger.info(`Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Account ${account.adsId} is calling google.`);
      GoolgeAdsService.getAdWordsName(account.adsId)
        .then(result => {
          return updateAdsNameIntoDB(result, callback);
        }).catch(err => {
          logger.error('Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Error google', JSON.stringify(err));
          return callback();
        });
    }, async error => {
      if(error)
      {
        logger.error('Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Error processing', JSON.stringify(error));
        return;
      }
      
      logger.info('Schedulejobs::UpdateAdsName::Success');
      return;
    });
  }catch(e){
    logger.error('Schedulejobs::UpdateAdsName::UpdateAdsNameForAccount::Error', JSON.stringify(e));
    return;
  }
};

const updateAdsNameIntoDB = (result, callback) => {
  logger.info('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Is called.');
  try{
    if(result.length <= 0)
    {
      logger.info('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Is called.');
      return callback();
    }

    Async.eachSeries(result, (ads, cb) => {
      AccountAdsModel.updateOne({adsId: ads.customerId} ,{ $set: {adsName: ads.name}}).exec(err => {
        if(err)
        {
          logger.error('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Error', JSON.stringify(err));
        }

        return cb();
      });
    }, error =>{
      if(error)
      {
        logger.error('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Error', JSON.stringify(error));
        return callback();
      }

      logger.info('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Success');
      return callback();
    });
  }catch(e){
    logger.error('Schedulejobs::UpdateAdsName::updateAdsNameIntoDB::Error', JSON.stringify(e));
    return callback();
  }
};

module.exports = () => {
  schedule.scheduleJob(timeUpdateAdsName, async() => {
    try{
      logger.info('Schedulejobs::UpdateAdsName::Is called.');
      const accountAds = await AccountAdsModel.find({isConnected : true, isDeleted: false});

      if(accountAds.length <= 0)
      {
        logger.info('Schedulejobs::UpdateAdsName::Account ads is empty.');
        return;
      }

      await updateAdsNameForAccount(accountAds);
    }catch(e){
      logger.error('Schedulejobs::UpdateAdsName::Error.', e);
      return;
    }
  });
};