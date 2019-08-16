const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const Async = require('async');
const GoogleAdsService = require('../services/GoogleAds.service');

const deleteIpInAutoBlackListOfAccountAds = (accountAds, cb) => {
    const info = {
        adsId:  accountAds.adsId,
        _id: accountAds._id
    };

    logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::is called.\n', info);
    try{

        if(!accountAds.setting.autoRemoveBlocking)
        {
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::success.\n', info);
            return cb();
        }

        const ipInAutoBlackList = accountAds.setting.autoBlackListIp;
        const accountId = accountAds._id;
        const adsId =  accountAds.adsId;
        const key = accountAds.key;
        const query = {
            accountId,
            isDeleted: false
        };
    
      BlockingCriterionsModel.find(query).exec((err, campaigns) => {
          if(err)
          {
              return cb(err);
          }

          if(campaigns.length === 0)
          {
              logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::accountAdsWithoutCampaign.\n', info);
              return cb(null);
          }

          if(ipInAutoBlackList.length === 0)
          {
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::autoBlackListipEmpty.\n', info);
            return cb(null);
          }

          const campaignIds = campaigns.map(campaign => campaign.campaignId);

          Async.eachSeries(campaignIds, (campaignId, callback) => {
            const campaignInfo = {
                accountId,
                campaignId,
                adsId,
                ipInAutoBlackList
            };

            deleteIpInAutoBlackListOfCampaign(campaignInfo, callback);
          }, error => {
              if(err)
              {
                logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', error, info);
                return cb(error);
              }

              const queryUpdate = {key, adsId};
              const dataUpdate = {$set: {"setting.autoBlackListIp": []}};

              AccountAdsModel.updateOne(queryUpdate, dataUpdate).exec(error => {
                  if(error)
                  {
                    logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', error, info);
                    return cb(error);
                  }
                  logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::success.', info);
                  return cb();
              });  
          });
      });
    }catch(e){
        logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', e, info);
        return cb(e);
    }
};
/**
 * 
 * @param {accountId: string, adsId: string, ipInAutoBlackList: array, campaignId: string} campaignInfo 
 * @param {function} cb 
 */
const deleteIpInAutoBlackListOfCampaign = (campaignInfo, cb) => {
    logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::is called.\n', campaignInfo);
    try{
        const ipInAutoBlackList = campaignInfo.ipInAutoBlackList;
        const campaignId = campaignInfo.campaignId;
        const accountId = campaignInfo.accountId;
        const adsId = campaignInfo.adsId;

        Async.eachSeries(ipInAutoBlackList, (ip, callback) => {
            const queryFindIpOfcampaign = {accountId, campaignId, "autoBlackListIp.ip": ip};
            const select = {'autoBlackListIp.$': 1};
        
            BlockingCriterionsModel
            .findOne(queryFindIpOfcampaign, select)
            .exec((errQuery, blockingCriterionRecord) => {
                if(errQuery)
                {
                    logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', errQuery, campaignInfo);
                    return callback(errQuery);
                }
                if(!blockingCriterionRecord)
                {
                    logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::IpNotInCampaign.', campaignInfo);
                    return callback(null);
                }

                const criterionId = blockingCriterionRecord.autoBlackListIp[0].criterionId;

                GoogleAdsService.removeIpBlackList(adsId, campaignId, ip, criterionId)
                .then(resultOfGoogleAds => {
                    const accountInfo = {
                        resultOfGoogleAds,
                        campaignId,
                        ip,
                        accountId
                    };

                    removeIpAndCriterionIdToTheBlacklistOfACampaign(accountInfo, callback);
                })
                .catch(error => {
                    logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', error, campaignInfo);
                    return callback(error);
                });
            });
        }, err => {
            if(err)
            {
                logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', err, campaignInfo);
                return cb(err);
            }
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::success.', campaignInfo);
            return cb();
        });
    }catch(e){
        logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', e, campaignInfo);
        return cb(e);
    }
};

/**
 * 
 * @param {resultOfGoogleAds: object, campaignId:string, ip: string, accountId: string} accountInfo 
 * @param {function} cb 
 */
const removeIpAndCriterionIdToTheBlacklistOfACampaign = (accountInfo, cb) => {
    const info = {
        ip: accountInfo.ip,
        campaignId: accountInfo.campaignId,
        accountId: accountInfo.accountId
    };

    logger.info('scheduleJobsService::removeIpAndCriterionIdToTheBlacklistOfACampaign::is called.\n', info);
    try{
        const resultOfGoogleAds = accountInfo.resultOfGoogleAds;
        const ip = accountInfo.ip;
        const campaignId = accountInfo.campaignId;
        const accountId =accountInfo.accountId;

        if(!resultOfGoogleAds)
        {
            logger.error('scheduleJobsService::removeIpAndCriterionIdToTheBlacklistOfACampaign::cantGetResultGoogleAds.', info);
            return cb(null);
        }

        const queryUpdate = {accountId, campaignId};
        const updateingData = {$pull: {autoBlackListIp : {ip}}};

        BlockingCriterionsModel
        .updateOne(queryUpdate, updateingData)
        .exec((err) => {
            if(err)
            {
                logger.error('scheduleJobsService::removeIpAndCriterionIdToTheBlacklistOfACampaign:error ', err, info);
                return cb(err);
            }
            logger.info('scheduleJobsService::removeIpAndCriterionIdToTheBlacklistOfACampaign::success ', info);
            return cb();
        });

    }catch(e){
        logger.error('scheduleJobsService::removeIpAndCriterionIdToTheBlacklistOfACampaign::error.', e, info);
        return cb(e);
    }
};

module.exports = {
    deleteIpInAutoBlackListOfAccountAds
};