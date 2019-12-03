const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const Async = require('async');
const GoogleAdsService = require('../services/GoogleAds.service');
const RemoveIpsService = require('../services/remove-ip.service');
const BlockingCriterionsConstant = require('../modules/blocking-criterions/blocking-criterions.constant');
const AdsAccountConstant = require('../modules/account-adwords/account-ads.constant');

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
          if(accountAds.setting.autoBlackListIp.length == 0)
          {
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::ip in auto blackList is empty.', info);
            return cb();
          }

          RemoveIpsService.removeIp(accountAds, campaignIds, accountAds.setting.autoBlackListIp, BlockingCriterionsConstant.positionBlockIp.AUTO_BLACKLIST, AdsAccountConstant.positionBlockIp.AUTO_BLACKLIST)
          .then(result => {
            logger.info('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::success.', info);
            return cb();
          }).catch(err => {
            logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', err, info);
            return cb();
          });
      });
    }catch(e){
        logger.error('scheduleJobsService::deleteIpInAutoBlackListOfAccountAds::error.', e, info);
        return cb();
    }
};

module.exports = {
    deleteIpInAutoBlackListOfAccountAds
};