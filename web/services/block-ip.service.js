const Async = require('async');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../services/GoogleAds.service');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const _ = require('lodash');
const AccountAdsConstant = require('../modules/account-adwords/account-ads.constant');
const BlockingCriterionsConstant = require('../modules/blocking-criterions/blocking-criterions.constant');
const UserModel = require('../modules/user/user.model');

const standardizedIp = (ip) => {
  const splitIp = ip.split('.');
  const splitIpClassD = splitIp[3].split('/');

  if(splitIpClassD.length > 1)
  {
      if(splitIpClassD[1] == '32')
      {
        ip = splitIp.slice(0,3).join('.') + "." + splitIpClassD[0];
      }
  }

  return ip;
};

const mapIpToUpdateDB = (campaignGoogle, result) => {
  const campaignsArr = [];
  campaignGoogle.forEach(campaign => {
    const temp = {
      campaignId: campaign,
      ipInfo: result.value.filter(cp => cp.campaignId === campaign).map(cp => 
        { return { 
          criterionId: cp.criterion.id,
          ip: standardizedIp(cp.criterion.ipAddress),
          createdAt: new Date()
        }
      })
    };

    campaignsArr.push(temp);
  });

  return campaignsArr;
};

const blockIp = (accountAds, campaigns, ips, positionBlockInBlockingCriterion, positionBlockInAccountAds) => {
  logger.info('BlockIpService::blockIp::is called', { ads: accountAds.adsId, campaigns, ips });
  return new Promise((res, rej) => {
    try{

      if(campaigns.length <=0 || ips.length <=0 || !accountAds)
      {
        logger.info('BlockIpService::blockIp::campaigns, ips or account Ads is empty', { ads: accountAds.adsId, campaigns, ips });
        return res('Thành công');
      }

      const ads = accountAds.adsId;

      //get campaignid on google ads
      GoogleAdwordsService.getCampaignsName(ads, campaigns)
      .then(async cp => {
        if(cp.length <= 0)
        {
          await updateIsDeletedStatusForCampaignDeleted(accountAds._id, campaigns);
          return res('Thành công');
        }

        campaignsGoogle = cp.map(campaign => campaign.id);
        const CampaignDeleted = _.difference(campaigns, campaignsGoogle);

        if(CampaignDeleted.length > 0)
        {
          await updateIsDeletedStatusForCampaignDeleted(accountAds._id, CampaignDeleted);
        }

        //block ips
        GoogleAdwordsService.addIpBlackListToCampaigns(ads, campaignsGoogle, ips)
        .then(result => {
          if(!result || result.length == 0)
          {
            logger.error('BlockIpService::blockIp::ip not in google Ads', { error });
            return res('Thành công');
          }

          const campaignsArr = mapIpToUpdateDB(campaignsGoogle, result);
          Async.eachSeries(campaignsArr, (campaign, callback) => {
            updateIpsIntoCampaign(campaign, positionBlockInBlockingCriterion, callback);
          }, async error => {
            if(error)
            {
              logger.error('BlockIpService::blockIp::Error', { error });
              console.log(error);
              return rej(error);
            }

            await saveIpIntoAutoBlackListIp(accountAds.key, ips, positionBlockInAccountAds);
            return res('Thành công');
          });
        }).catch(err => {
          logger.error('BlockIpService::blockIp::Error', { error: GoogleAdwordsService.getErrorCode(err) });
          console.log(err);
          return rej(err);
        });
      }).catch( async e => {
        logger.error('BlockIpService::blockIp::Error', { error: GoogleAdwordsService.getErrorCode(e) });

        if (GoogleAdwordsService.getErrorCode(e) === 'USER_PERMISSION_DENIED' && accountAds.connectType === AccountAdsConstant.connectType.byEmail)
        {
          await UserModel.updateOne({_id: accountAds.user}, {$set: {isRefreshTokenValid: false}});
        }
        
        console.log(e);
        return rej(e);
      });
    }catch(e){
      logger.error('BlockIpService::blockIp::Error', { error: e });
      console.log(e);
      return rej(e);
    }
  });
};

const saveIpIntoAutoBlackListIp = async (key, ips, positionBlockInAccountAds) => {
  logger.info('BlockIpService::saveIpIntoAutoBlackListIp::is called', { key, ips, positionBlockInAccountAds });
  try {
      let updateData = { $push: { ["setting." + positionBlockInAccountAds]: { $each: ips } } };

      if(AccountAdsConstant.positionBlockIp.SAMPLE_BLACKLIST == positionBlockInAccountAds)
      {
        updateData = { $set: { ["setting." + positionBlockInAccountAds]: ips[0] } };
      }

      return await AccountAdsModel.updateOne({ key }, updateData);
  } catch (e) {
      logger.error('BlockIpService::saveIpIntoAutoBlackListIp::error', e);
      throw new Error(e);
  }
};

const updateIpsIntoCampaign = async(campaignInfo, positionBlock, callback) => {
  logger.info('BlockIpService::updateIpsIntoCampaign::is called', { campaignInfo });
  try{
    if(campaignInfo.ipInfo.length <= 0)
    {
      logger.info('BlockIpService::updateIpsIntoCampaign::ips is empty');
      return callback();
    }

    const conditionUpdate = { campaignId: campaignInfo.campaignId };
    let dataUpdate = { $push : { [positionBlock]: { $each: campaignInfo.ipInfo } } };

    if(BlockingCriterionsConstant.positionBlockIp.SAMPLE_BLACKLIST == positionBlock)
    {
      dataUpdate = { $set : { [positionBlock]: campaignInfo.ipInfo[0] } };
    }

    await BlockingCriterionsModel.updateMany(conditionUpdate, dataUpdate);
    return callback();
  }catch(e){
    logger.error('BlockIpService::updateIpsIntoCampaign::error', e);
    return callback();
  }
}

const updateIsDeletedStatusForCampaignDeleted = async (accountId, campaigns) => {
  logger.info('BlockIpService::UpdateIsDeletedStatusForCampaignDeleted::is called', { accountId, campaigns });
  try {
    const conditionUpdate = {accountId, campaignId: { $in: campaigns }};
    const dataUpdate = {$set: { isDeleted: true, isOriginalDeleted: true }};
    return await BlockingCriterionsModel.updateMany(conditionUpdate, dataUpdate);
  } catch (e) {
    logger.error('BlockIpService::UpdateIsDeletedStatusForCampaignDeleted::error', e);
    throw new Error(e);
  }
};

module.exports = {
  standardizedIp,
  mapIpToUpdateDB,
  blockIp
}