const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const AdwordsUser = require('node-adwords').AdwordsUser;
const adwordConfig = require('config').get('google-ads');
const AdwordsConstants = require('node-adwords').AdwordsConstants;
const ManagerCustomerMsgs = {
  ALREADY_MANAGED_BY_THIS_MANAGER: 'Hệ thống đã được quý khách chấp nhận quyền quản lý',
  ALREADY_INVITED_BY_THIS_MANAGER: 'Hệ thống đã gửi yêu cầu quyền quản lý đến tài khoản adword của quý khách. Vui lòng kiểm tra lại.',
  ALREADY_MANAGED_IN_HIERARCHY: '',
  ALREADY_MANAGED_FOR_UI_ACCESS: '',
  UNKNOWN: 'Không xác định được lỗi',
  NOT_AUTHORIZED: 'Không có quyền',
  ADD_CUSTOMER_FAILURE: '',
  '': 'Không xác định'
};

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

    ManagedCustomerService.mutateLink({ operations: [operation] }, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::sendManagerRequest::error', error);
        return reject(error);
      }

      logger.info('GoogleAdsService::sendManagerRequest::result', result);
      return resolve(result);
    });
  });
};

/**
 * Get list campaign of an adword id
 * @param {string} adwordId
 * @return {Promise<any>}
 */
const getListCampaigns = function (adwordId) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::getListCampaigns', adwordId);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordId,
    });

    let campaignService = user.getService('CampaignService', adwordConfig.version);
    const selector = {
      fields: ['Id', 'Name'],
      ordering: [{ field: 'Name', sortOrder: 'ASCENDING' }],
      paging: { startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE }
    };

    campaignService.get({ serviceSelector: selector }, (error, result) => {
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
 * @param {string} adwordId
 * @param {string} campaignId
 * @param {string} ipAddress
 * @return {Promise<any>}
 */
const addIpBlackList = function (adwordId, campaignId, ipAddress) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::addIpBlackList', adwordId, campaignId, ipAddress);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordId,
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

    CampaignCriterionService.mutate({ operations: [operation] }, (error, result) => {
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
 * @param {string} adwordId
 * @param {string} campaignId
 * @param {string} ipAddress
 * @param {string} idCriterion
 * @return {Promise<any>}
 */
const removeIpBlackList = function (adwordId, campaignId, ipAddress, idCriterion) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::removeIpBlackList', adwordId, campaignId, ipAddress);

    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordId,
    });
    const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
    const operation = {
      operator: 'REMOVE',
      operand: {
        campaignId: campaignId,
        criterion: {
          id: idCriterion,
          type: 'IP_BLOCK',
          'xsi:type': 'IpBlock',
          ipAddress: ipAddress,
        },
        'xsi:type': 'NegativeCampaignCriterion'
      }
    };

    CampaignCriterionService.mutate({ operations: [operation] }, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::removeIpBlackList::error', error);
        return reject(error);
      }
      logger.info('GoogleAdsService::removeIpBlackList::success', result);
      return resolve(result);
    });
  });
};

const getPendingInvitation = (adWordId) => {
  return new Promise((resolve, reject) => {
    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordConfig.clientCustomerId,
    });

    const ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
    const selector = {
      managerCustomerIds: [adwordConfig.managerCustomerId],
      clientCustomerIds: [adWordId]
    };

    ManagedCustomerService.getPendingInvitations(selector, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    });
  });
};

const _getErrorCode = (error) => {
  return (
    !error ||
    !error.root ||
    !error.root.Envelope ||
    !error.root.Envelope.Body ||
    !error.root.Envelope.Body.Fault ||
    !error.root.Envelope.Body.Fault.detail ||
    !error.root.Envelope.Body.Fault.detail ||
    !error.root.Envelope.Body.Fault.detail.ApiExceptionFault ||
    !error.root.Envelope.Body.Fault.detail.ApiExceptionFault.errors ||
    !error.root.Envelope.Body.Fault.detail.ApiExceptionFault.errors.reason
  ) ? ''
    : error.root.Envelope.Body.Fault.detail.ApiExceptionFault.errors.reason;
};

const mapManageCustomerErrorMessage = (error) => {
  const reason = _getErrorCode(error);
  logger.info('GoogleAdsService::mapManageCustomerErrorMessage::info', {reason});

  return ManagerCustomerMsgs[reason];
};

module.exports = {
  sendManagerRequest,
  getListCampaigns,
  addIpBlackList,
  removeIpBlackList,
  getPendingInvitation,
  mapManageCustomerErrorMessage
};
