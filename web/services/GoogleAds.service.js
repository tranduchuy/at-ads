const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const AdwordsUser = require('node-adwords').AdwordsUser;
const adwordConfig = require('config').get('google-ads');
const AdwordsConstants = require('node-adwords').AdwordsConstants;

const sendManagerRequest = function (accountAdsId) {
  
  logger.info('GoogleAdsService::sendManagerRequest', accountAdsId);
  
  const user = new AdwordsUser({
    developerToken: adwordConfig.developerToken,
    userAgent: adwordConfig.userAgent,
    client_id: adwordConfig.client_id,
    client_secret: adwordConfig.client_secret,
    refresh_token: adwordConfig.refresh_token,
    clientCustomerId: adwordConfig.clientCustomerId,
  });
  
  let ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
  const operation = {
    operator: 'ADD',
    operand: {
      managerCustomerId: adwordConfig.managerCustomerId,
      clientCustomerId: accountAdsId,
      linkStatus: 'PENDING',
      pendingDescriptiveName: adwordConfig.pendingDescriptiveName,
      isHidden: false
    }
  }
  
  ManagedCustomerService.mutateLink({operations: [operation]}, (error, result) => {
    if (error) {
      logger.error('GoogleAdsService::sendManagerRequest', error);
    }
    logger.info('GoogleAdsService::sendManagerRequest', result);
    return result;
  });
};

const getListCampaigns = function (accountAdsId) {
  
  logger.info('GoogleAdsService::getListCampaigns', accountAdsId);
  
  const user = new AdwordsUser({
    developerToken: adwordConfig.developerToken,
    userAgent: adwordConfig.userAgent,
    client_id: adwordConfig.client_id,
    client_secret: adwordConfig.client_secret,
    refresh_token: adwordConfig.refresh_token,
    clientCustomerId: accountAdsId,
  });
  
  let campaignService = user.getService('CampaignService', adwordConfig.version);
  const selector = {
    fields: ['Id', 'Name'],
    ordering: [{field: 'Name', sortOrder: 'ASCENDING'}],
    paging: {startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE}
  }
  
  campaignService.get({serviceSelector: selector}, (error, result) => {
    if (error) {
      logger.error('GoogleAdsService::getListCampaigns', error);
    }
    logger.info('GoogleAdsService::getListCampaigns', result);
    return result;
  });
};

const addIpBlackList = function (accountAdsId, campaignId, ipAddress) {
  
  logger.info('GoogleAdsService::addIpBlackList', accountAdsId, campaignId, ipAddress);
  
  const user = new AdwordsUser({
    developerToken: adwordConfig.developerToken,
    userAgent: adwordConfig.userAgent,
    client_id: adwordConfig.client_id,
    client_secret: adwordConfig.client_secret,
    refresh_token: adwordConfig.refresh_token,
    clientCustomerId: accountAdsId,
  });
  
  let CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
  var operation = {
    operator: 'ADD',
    operand: {
      campaignId: campaignId,
      criterion: {
        type: 'IP_BLOCK',
        'xsi:type': 'IpBlock',
        ipAddress: ipAddress,
      },
      'xsi:type': 'NegativeCampaignCriterion'
    }
  };
  
  CampaignCriterionService.mutate({operations: [operation]}, (error, result) => {
    if (error) {
      logger.error('GoogleAdsService::addIpBlackList', error);
    }
    logger.info('GoogleAdsService::addIpBlackList', result);
    return result;
  });
};

const removeIpBlackList = function (accountAdsId, campaignId, ipAddress, idCriterion) {
  
  logger.info('GoogleAdsService::removeIpBlackList', accountAdsId, campaignId, ipAddress);
  
  const user = new AdwordsUser({
    developerToken: adwordConfig.developerToken,
    userAgent: adwordConfig.userAgent,
    client_id: adwordConfig.client_id,
    client_secret: adwordConfig.client_secret,
    refresh_token: adwordConfig.refresh_token,
    clientCustomerId: accountAdsId,
  });
  
  let CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
  var operation = {
    operator: 'REMOVE',
    operand: {
      campaignId: campaignId,
      criterion: {
        id : idCriterion,
        type: 'IP_BLOCK',
        'xsi:type': 'IpBlock',
        ipAddress: ipAddress,
      },
      'xsi:type': 'NegativeCampaignCriterion'
    }
  };
  
  CampaignCriterionService.mutate({operations: [operation]}, (error, result) => {
    if (error) {
      logger.error('GoogleAdsService::removeIpBlackList', error);
    }
    logger.info('GoogleAdsService::removeIpBlackList', result);
    return result;
  });
};

module.exports = {
  sendManagerRequest,
  getListCampaigns,
  addIpBlackList,
  removeIpBlackList
};