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
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::Auto remove blocking is false.\n', info);
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
              return cb();
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
              if(error)
              {
                logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', error, info);
                return cb();
              }

              const queryUpdate = {key, adsId};
              const dataUpdate = {$set: {"setting.autoBlackListIp": []}};

              AccountAdsModel.updateOne(queryUpdate, dataUpdate).exec(error => {
                  if(error)
                  {
                    logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', error, info);
                    return cb();
                  }
                  logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::success.', info);
                  return cb();
              });  
          });
      });
    }catch(e){
        logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', e, info);
        return cb();
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
                        campaignId,
                        ip,
                        accountId
                    };

                    removeIpAndCriterionIdToTheBlacklistOfACampaign(accountInfo, callback);
                })
                .catch(error => {
                    switch (GoogleAdsService.getErrorCode(error)) {
                        case 'INVALID_ID' :
                          logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::INVALID_ID', {campaignId});
                          const accountInfo = { campaignId, ip, accountId };
                          return removeIpAndCriterionIdToTheBlacklistOfACampaign(accountInfo, callback);;
                        case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                          logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                          const account = { campaignId, ip, accountId };
                          return removeIpAndCriterionIdToTheBlacklistOfACampaign(account, callback);;
                        default:
                          const message = GoogleAdsService.getErrorCode(error);
                          logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error', message);
                          return callback();
                      }
                });
            });
        }, err => {
            if(err)
            {
                logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', err, campaignInfo);
                return cb();
            }
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::success.', campaignInfo);
            return cb();
        });
    }catch(e){
        logger.error('scheduleJobsService::deleteIpInAutoBlackListOfCampaign::error.', e, campaignInfo);
        return cb();
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
        const ip = accountInfo.ip;
        const campaignId = accountInfo.campaignId;
        const accountId =accountInfo.accountId;
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