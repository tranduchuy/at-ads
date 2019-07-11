const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const AdwordsUser = require('node-adwords').AdwordsUser;
const adwordConfig = require('config').get('google-ads');
const AdwordsConstants = require('node-adwords').AdwordsConstants;

/**
 * Send request to manage an adword id
 * @param {string} accountAdsId
 * @return {Promise<any>}
 */
const sendManagerRequest = function (accountAdsId) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::sendManagerRequest', accountAdsId);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordConfig.clientCustomerId,
    });

    const ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
    const operation = {
      operator: 'ADD',
      operand: {
        managerCustomerId: adwordConfig.managerCustomerId,
        clientCustomerId: accountAdsId,
        linkStatus: 'PENDING',
        pendingDescriptiveName: adwordConfig.pendingDescriptiveName,
        isHidden: false
      }
    };

    ManagedCustomerService.mutateLink({operations: [operation]}, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::sendManagerRequest::error', error);
        return reject(error);
      }

      logger.info('GoogleAdsService::sendManagerRequest::result', result);
      return resolve(resolve);
    });
  });
};

/**
 * Get list campaign of an adword id
 * @param {string} accountAdsId
 * @return {Promise<any>}
 */
const getListCampaigns = function (accountAdsId) {
  return new Promise((resolve, reject) => {
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
    };

    campaignService.get({serviceSelector: selector}, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::getListCampaigns::error', error);
        return reject(error);
      }

      logger.info('GoogleAdsService::getListCampaigns::success', result);
      return resolve(resolve);
    });
  });
};

/**
 * Add an ip to blacklist
 * @param {string} accountAdsId
 * @param {string} campaignId
 * @param {string} ipAddress
 * @return {Promise<any>}
 */
const addIpBlackList = function (accountAdsId, campaignId, ipAddress) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::addIpBlackList', accountAdsId, campaignId, ipAddress);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: accountAdsId,
    });

    const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
    const operation = {
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
        logger.error('GoogleAdsService::addIpBlackList::error', error);
        return reject(error);
      }

      logger.info('GoogleAdsService::addIpBlackList::success', result);
      return resolve(result);
    });
  });
};

/**
 * Remove ip from blacklist
 * @param {string} accountAdsId
 * @param {string} campaignId
 * @param {string} ipAddress
 * @param {string} idCriterion
 * @return {Promise<any>}
 */
const removeIpBlackList = function (accountAdsId, campaignId, ipAddress, idCriterion) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::removeIpBlackList', accountAdsId, campaignId, ipAddress);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: accountAdsId,
    });
    const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
    const operation = {
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
        logger.error('GoogleAdsService::removeIpBlackList::error', error);
        return reject(error);
      }
      logger.info('GoogleAdsService::removeIpBlackList::success', result);
      return resolve(result);
    });
  });
};

module.exports = {
  sendManagerRequest,
  getListCampaigns,
  addIpBlackList,
  removeIpBlackList
};
