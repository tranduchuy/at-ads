const schedule = require('node-schedule');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const BlockingCriterionsModel =require('../modules/blocking-criterions/blocking-criterions.model');
const RemoveIpInAutoBlackListService = require('./remove-ip-in-auto-blackList.service');
const GoolgeAdsService = require('../services/GoogleAds.service');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeUpdateCampaignName = config.get('appScheduleJobs').timeUpdateCampaignName;
const _ = require('lodash');

const getCampaignInAccount = (accountAds, cb) => {
    const info = {
        adsId:  accountAds.adsId,
        _id: accountAds._id
    };

    logger.info('scheduleJobs::getCampaignInAccount::is called.\n', info);
    try{
        const accountId = accountAds._id;
        const query = {
            accountId,
            isDeleted: false
        };
    
      BlockingCriterionsModel.find(query).exec(async (err, campaigns) => {
          if(err)
          {
              return cb();
          }

          if(campaigns.length === 0)
          {
              logger.info('scheduleJobs::getCampaignInAccount::accountAdsWithoutCampaign.\n', info);
              return cb(null);
          }

          const campaignIds = campaigns.map(campaign => campaign.campaignId);
          const adsId = accountAds.adsId;

          const campaignsOnGoogleAds = await GoolgeAdsService.getCampaignsName(adsId, campaignIds);
          const campaignIdOnGoogleAds = campaignsOnGoogleAds.map(campaign => campaign.id);

          if(campaignsOnGoogleAds.length === 0)
          {
            logger.info('scheduleJobs::getCampaignInAccount::accountAdsWithoutCampaign.\n', info);
            return cb(null);
          }

          const campaignIdDeleted = _.difference(campaignIds, campaignIdOnGoogleAds); 
          if(campaignIdDeleted.length > 0)
          {
              await BlockingCriterionsModel.updateMany({accountId, campaignId: {$in: campaignIdDeleted}},{$set: {isDeleted: true, isOriginalDeleted: true}});
          }

          Async.eachSeries(campaignsOnGoogleAds, (campaign, callback) => {
            const campaignInfo = {
                accountId,
                campaign
            };
            updateCampaignNameForOneCampaign(campaignInfo, callback);
          }, error => {
              if(err)
              {
                logger.error('scheduleJobs::getCampaignInAccount::error.', error, info);
                return cb();
              }

                logger.info('scheduleJobs::getCampaignInAccount::success.', info);
                return cb();  
          });
      });
    }catch(e){
        logger.error('scheduleJobs::getCampaignInAccount::error.', e, info);
        return cb();
    }
};

/**
 * 
 * @param {accountId: string, campaign: { id: string, name: string }} campaignInfo 
 * @param {function} cb 
 */
const updateCampaignNameForOneCampaign = (campaignInfo, cb) => {
    logger.info('scheduleJobs::updateCampaignNameForOneCampaign::is called.\n', campaignInfo);

    const queryUpdate = {
        accountId: campaignInfo.accountId,
        campaignId: campaignInfo.campaign.id
    };

    const dataUpdate = {
        $set: {
            campaignName: campaignInfo.campaign.name
        }
    };

    BlockingCriterionsModel
    .updateOne(queryUpdate, dataUpdate)
    .exec(err => {
        if(err)
        {
            logger.error('scheduleJobs::updateCampaignNameForOneCampaign::error.\n', err, campaignInfo);
            return cb();
        }
        logger.info('scheduleJobs::updateCampaignNameForOneCampaign::success.\n', campaignInfo);
        return cb();
    })
};

module.exports =  () => {
    schedule.scheduleJob(timeUpdateCampaignName, async() => {
        logger.info('scheduleJobs::updateCampaignName is called');
        try{
            const allAccountAds = await AccountAdsModel.find({isConnected : true, isDeleted: false});

            if(allAccountAds.length === 0)
            {
                logger.info('scheduleJobs::updateCampaignName::NotAccountAds');
                return;
            }
            
            Async.eachSeries(allAccountAds, (accountAds, callback) => {
                getCampaignInAccount(accountAds, callback);
            }, err => {
                if(err)
                {
                    logger.error('scheduleJobs::updateCampaignName::error', err);
                    return;
                }
                logger.info('scheduleJobs::updateCampaignName::success');
                return;
            });
        }
        catch{
            logger.error('scheduleJobs::updateCampaignName::error', e);
            console.log(JSON.stringify(e));
            return;
        } 
    });
};