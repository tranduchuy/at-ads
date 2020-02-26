const AccountAdsSerivces = require('../modules/account-adwords/account-ads.service');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const schedule = require('node-schedule');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeSyncIpsOnGoole = config.get('appScheduleJobs').timeSyncIpsOnGoole;

const syncIpOnGoogleForAccountAds = async (accountAds, callback) => {
  logger.info('Schedulejobs::Sync ips on google::syncIpOnGoogleForAccountAds::Is called.');
  try{
    const campaign = await BlockingCriterionsModel.find({ accountId: accountAds._id, isDeleted: false });

    if(campaign.length <= 0)
    {
      logger.info('Schedulejobs::Sync ips on google::syncIpOnGoogleForAccountAds::campaign empty.');
      return callback();
    }

    const campaignIds = campaign.map(cp => { return cp.campaignId });

    logger.info('Schedulejobs::Sync ips on google::syncIpOnGoogleForAccountAds::processing....', { campaignIds });
    await AccountAdsSerivces.backUpIpOnGoogleAds(accountAds, campaignIds);
    await AccountAdsModel.updateOne({adsId: accountAds.adsId}, {$set: {syncIps: false}});
    logger.info('Schedulejobs::Sync ips on google::syncIpOnGoogleForAccountAds::success.');
    return callback();
  }catch(e){
    logger.error('Schedulejobs::Sync ips on google::syncIpOnGoogleForAccountAds::Error.', e);
    return callback();
  }
}

module.exports = () => {
  schedule.scheduleJob(timeSyncIpsOnGoole, async() => {
    try{
      logger.info('Schedulejobs::Sync ips on google::Is called.');
      const accountAds = await AccountAdsModel.find({ isConnected : true, isDeleted: false, syncIps : true, isDisabled: false });

      if(accountAds.length <= 0)
      {
        logger.info('Schedulejobs::Sync ips on google::Account ads is empty.');
        return;
      }

      Async.eachSeries(accountAds, (ads, callback) => {
        syncIpOnGoogleForAccountAds(ads, callback);
      }, err => {
        if(err)
        {
          logger.error('Schedulejobs::Sync ips on google::Error.', e);
          return;
        }

        logger.info('Schedulejobs::Sync ips on google::success.');
        return;
      })
    }catch(e){
      logger.error('Schedulejobs::Sync ips on google::Error.', e);
      return;
    }
  });
};