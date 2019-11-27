const schedule = require('node-schedule');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const UserModel = require('../modules/user/user.model');
const GoolgeAdsService = require('../services/GoogleAds.service');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeUpdateTrackingUrl = config.get('appScheduleJobs').timeUpdateTrackingUrl;
const AccountAdsService = require('../modules/account-adwords/account-ads.service');

const updateTrackingUrlForCampaignAccountAds = (accountAds) => {
  logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::Is called.');
  try{
    Async.eachSeries(accountAds, (ads, callback) => {
      const temp = { adsAccount: ads };
      AccountAdsService.getListOriginalCampaigns(temp)
      .then(result => {
        let campaignIds = [];

        if(result.data.campaignList.length <= 0)
        {
          logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::campaign is empty.');
          return callback();
        }

        campaignIds = result.data.campaignList.map(campaign => campaign.id);
        console.log(campaignIds);
        GoolgeAdsService.setTrackingUrlTemplateForCampaign(ads.adsId, campaignIds)
        .then(result => {
          logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::called google success.');
          return callback();
        }).catch(e => {
          logger.error('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::Error.', e);
          return callback();
        })
      }).catch(error => {
        logger.error('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::Error.', error);
        return callback();
      });
    }, err => {
      if(err)
      {
        logger.error('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::Error.', err);
        return;
      }
      logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::success.');
      return;
    })
  }catch(e){
    logger.error('Schedulejobs::UpdateTimeUpdateTrackingUrl::updateTrackingUrlForCampaignAccountAds::Error.', e);
    return;
  }
};

module.exports = () => {
  schedule.scheduleJob(timeUpdateTrackingUrl, async() => {
    try{
      logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::Is called.');

      const users = await UserModel.find({ isRefreshTokenValid : true });

      if(users.length <= 0)
      {
        logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::User is empty.');
        return;
      }

      const userIds = users.map(user => user._id);
      const accountAds = await AccountAdsModel.find({user: { $in: userIds }, isConnected : true, isDeleted: false});

      if(accountAds.length <= 0)
      {
        logger.info('Schedulejobs::UpdateTimeUpdateTrackingUrl::accountAds is empty.');
        return;
      }

      await updateTrackingUrlForCampaignAccountAds(accountAds);
    }catch(e){
      logger.error('Schedulejobs::UpdateTimeUpdateTrackingUrl::Error.', e);
      return;
    }
  });
};