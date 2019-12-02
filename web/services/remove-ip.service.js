const Async = require('async');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const GoogleAdwordsService = require('../services/GoogleAds.service');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const _ = require('lodash');
const AccountAdsConstant = require('../modules/account-adwords/account-ads.constant');
const BlockingCriterionsConstant = require('../modules/blocking-criterions/blocking-criterions.constant');

const standardizedIps = (ips) => {
  let ipsArr = [];
  ips.forEach(ip => {
    const splitIp = ip.split('.');
    const splitIpClassD = splitIp[3].split('/');

    if(splitIpClassD.length < 2)
    {
      ipsArr.push(ip + '/32');
    }
    else
    {
      ipsArr.push(ip);
    }
  });

  return ipsArr;
};

const mapIpAndCriterion = (result) => {
  const campaignsArr = [];
  const ips_Block = result.filter(ip => ip.criterion.type === 'IP_BLOCK');
  ips_Block.forEach(campaign => {
    const temp = {
      campaignId: campaign.campaignId,
      criterionId: campaign.criterion.id,
      ip: campaign.criterion.ipAddress,
    };

    campaignsArr.push(temp);
  });

  return campaignsArr;
};

const removeIp = (accountAds, campaigns, ips, positionBlockInBlockingCriterion, positionBlockInAccountAds) => {
  return new Promise((res, rej) => {
    try{
      const ads = accountAds.adsId;

      //get campaignId;
      GoogleAdwordsService.getCampaignsName(ads, campaigns)
      .then(async cp => {
        if(cp.length <= 0)
        {
          await updateIsDeletedStatusForCampaignDeleted(accountAds._id, campaigns);
          return res('Thành công');
        }

        campaignGoogle = cp.map(campaign => campaign.id);
        const CampaignDeleted = _.difference(campaigns, campaignGoogle);
        
        if(CampaignDeleted.length > 0)
        {
          await updateIsDeletedStatusForCampaignDeleted(accountAds._id ,CampaignDeleted);
        }

        const ipsAfterstandardized = standardizedIps(ips);

        //get ip exists of campaign on google
        GoogleAdwordsService.getIpOnGoogleFilteredByCampaignsAndIps(ads, campaignGoogle, ipsAfterstandardized)
        .then(result => {
          if(result.length <= 0)
          {
            return res('Thành công');
          }

          const mapIp = mapIpAndCriterion(result);

          //remove ips
          GoogleAdwordsService.removeIpBlackListToCampaigns(ads, mapIp)
          .then(async result => {
            await removeIpsInCampaign(campaignGoogle, ips, positionBlockInBlockingCriterion);
            const ipInAccountAds = accountAds.setting;
            const ipNotExistsInListArr = _.difference(ipInAccountAds[positionBlockInAccountAds], ips);
            await removeIpInAccount(accountAds.key, ipNotExistsInListArr, positionBlockInAccountAds);

            return res('Thành công');
          }).catch(err => {
            logger.error('RemoveService::removeIp::error', err);
            return rej(err);
          });

        }).catch(err => {
          logger.error('RemoveService::removeIp::error', err);
          return rej(err);
        });

      }).catch(err => {
        logger.error('RemoveService::removeIp::error', err);
        return rej(err);
      });
    }catch(e){
      logger.error('RemoveService::removeIp::error', e);
      return rej(e);
    }
  });
};

const removeIpInAccount = async (key, ips, positionBlockInAccountAds) => {
  logger.info('BlockIpService::removeIpInAccount::is called', { key, ips, positionBlockInAccountAds });
  try {
      let updateData = { $set: { ['setting.' + positionBlockInAccountAds] : ips } };

      if(AccountAdsConstant.positionBlockIp.SAMPLE_BLACKLIST == positionBlockInAccountAds)
      {
        updateData = { $set: { ["setting." + positionBlockInAccountAds]: null } };
      }

      return await AccountAdsModel.updateOne({ key }, updateData);
  } catch (e) {
      logger.error('BlockIpService::removeIpInAccount::error', e);
      throw new Error(e);
  }
};

const removeIpsInCampaign = async(campaigns, ips, positionBlock) => {
  logger.info('BlockIpService::removeIpsInCampaign::is called', { campaigns, ips, positionBlock });
  try{
    if(campaigns.length <= 0)
    {
      logger.info('BlockIpService::removeIpsInCampaign::ips is empty');
      return;
    }

    const conditionUpdate = { campaignId: { $in: campaigns } };
    let dataUpdate = { $pull : { [positionBlock]: { ip: { $in: ips } } } };

    if(BlockingCriterionsConstant.positionBlockIp.SAMPLE_BLACKLIST == positionBlock)
    {
      dataUpdate = { $set : { [positionBlock]: null } };
    }

    console.log(JSON.stringify({conditionUpdate, dataUpdate}));

    await BlockingCriterionsModel.updateMany(conditionUpdate, dataUpdate);
    return;
  }catch(e){
    logger.error('BlockIpService::removeIpsInCampaign::error', e);
    throw new Error(e);
  }
}

const updateIsDeletedStatusForCampaignDeleted = async (accountId, campaigns) => {
  logger.info('RemoveService::UpdateIsDeletedStatusForCampaignDeleted::is called', { accountId, campaigns });
  try {
    const conditionUpdate = {accountId, campaignId: { $in: campaigns }};
    const dataUpdate = {$set: { isDeleted: true, isOriginalDeleted: true }};
    return await BlockingCriterionsModel.updateMany(conditionUpdate, dataUpdate);
  } catch (e) {
    logger.error('RemoveService::UpdateIsDeletedStatusForCampaignDeleted::error', e);
    throw new Error(e);
  }
};

module.exports = {
  removeIp
}