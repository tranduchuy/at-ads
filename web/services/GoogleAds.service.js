const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const AdwordsUser = require('node-adwords').AdwordsUser;
const adwordConfig = require('config').get('google-ads');
const AdwordsConstants = require('node-adwords').AdwordsConstants;
const ManagerCustomerMsgs = require('../constants/ManagerCustomerMsgs');
const AdwordsReport = require('node-adwords').AdwordsReport;
const DeviceConstants = require('../constants/device.constant');

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
 * @return {Promise<[{id: string, name: string}]>}
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
      fields: ['Id', 'Name', 'Status', 'ServingStatus', 'TargetGoogleSearch'],
      ordering: [{ field: 'Name', sortOrder: 'ASCENDING' }],
      paging: { startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE }
    };

    campaignService.get({ serviceSelector: selector }, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::getListCampaigns::error', error);
        return reject(error);
      }

      logger.info('GoogleAdsService::getListCampaigns::success', result);
      if (result.entries) {
        return resolve(result.entries);
      }

      return resolve([]);
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

/**
 * @typedef {Object} InvitationPendingPersonInfo
 * @property {string} name
 * @property {string} customerId
 * @property {boolean} canManageClients
 *
 * @typedef {Object} InvitationPending
 * @property {InvitationPendingPersonInfo} manager
 * @property {InvitationPendingPersonInfo} client
 * @property {Date} creationDate
 * @property {Date} expirationDate
 */

/**
 * @description Get list pending (not expired) invitations.
 * Example result:
 * [{
      "manager": {
            "name": "APPNET - MCC",
            "customerId": "5837626610",
            "canManageClients": true
      },
      "client": {
          "name": "Appnet Technology muốn quản lý các chiến dịch Ads của bạn",
          "customerId": "6668385722",
          "canManageClients": false
      },
      "creationDate": "20190713 215231 Asia/Ho_Chi_Minh",
      "expirationDate": "20190812 215231 Asia/Ho_Chi_Minh"
    },
 {
      "manager": {
          "name": "APPNET - MCC",
          "customerId": "5837626610",
          "canManageClients": true
      },
      "client": {
          "name": "Appnet Technology muốn quản lý các chiến dịch Ads của bạn",
          "customerId": "8062361209",
          "canManageClients": true
      },
      "creationDate": "20190713 215527 Asia/Ho_Chi_Minh",
      "expirationDate": "20190812 215527 Asia/Ho_Chi_Minh"
    }]
 * @return {Promise<[InvitationPending]>}
 */
const getPendingInvitations = () => {
  return new Promise((resolve, reject) => {
    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
    });

    const ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
    ManagedCustomerService.getPendingInvitations({selector: {}}, (error, result) => {
      if (error) {
        return reject(error);
      }

      return resolve(result);
    });
  });
};

const getErrorCode = (error) => {
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
  const reason = getErrorCode(error);
  logger.info('GoogleAdsService::mapManageCustomerErrorMessage::info', {reason});

  return ManagerCustomerMsgs[reason];
};

/**
 * Get list campaign of an adword id
 * @param {string} adwordId
 * @return {Promise<[{id: string, name: string}]>}
 */
const getAccountHierachy = function (adwordId) {
  return new Promise((resolve, reject) => {
    logger.info('GoogleAdsService::getAccountHierachy', adwordId);
    
    const user = new AdwordsUser({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordId,
    });
    
    let managedCustomerService = user.getService('managedCustomerService', adwordConfig.version);
    const selector = {
      fields: ['CustomerId', 'Name'],
      ordering: [{field: 'CustomerId', sortOrder: 'ASCENDING'}],
      paging: { startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE }
    };
  
    managedCustomerService.get({ serviceSelector: selector }, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::getAccountHierachy::error', error);
        return reject(error);
      }
      
      logger.info('GoogleAdsService::getAccountHierachy::success', result);
      if (result.entries) {
        return resolve(result.entries);
      }
      
      return resolve([]);
    });
  });
};

const getReportOnDevice = (adwordId, campaignIds, fields, startDate, endDate) => {
  logger.info('GoogleAdsService::getReportOfOneCampaign', adwordId);
  return new Promise((resolve, reject) => {
    const report = new AdwordsReport({
      developerToken: adwordConfig.developerToken,
      userAgent: adwordConfig.userAgent,
      client_id: adwordConfig.client_id,
      client_secret: adwordConfig.client_secret,
      refresh_token: adwordConfig.refresh_token,
      clientCustomerId: adwordId,
    });
    report.getReport(adwordConfig.version, {
        reportName: 'Custom Adgroup Performance Report',
        reportType: 'CAMPAIGN_PERFORMANCE_REPORT',
        fields,
        filters: [
            {field: 'CampaignStatus', operator: 'IN', values: ['ENABLED', 'PAUSED']},
            {field: 'CampaignId', operator: 'IN', values: campaignIds}
        ],
        dateRangeType: 'CUSTOM_DATE',
        startDate,
        endDate,
        format: 'CSV'
    }, (error, report) => {
      if (error) {
        logger.error('GoogleAdsService::getReportOnDevice::error', error);
        return reject(error);
      }
      logger.info('GoogleAdsService::getReportOnDevice::success', report);
      return resolve(report);
    });
  });
};

const enabledOrPauseTheCampaignByDevice = (adwordId, campaignId, criterionId, bidModifier) => {
  const info = {adwordId, campaignId, criterionId, bidModifier}
  logger.info('GoogleAdsService::enabledOrPauseTheCampaignByDevice', info);
  return new Promise((resolve, reject) => {
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
      operator: 'SET',
      operand: {
        campaignId: campaignId,
        criterion: {
          id: criterionId,
          type: 'INTERACTION_TYPE',
        },
        bidModifier
      }
    };

    CampaignCriterionService.mutate({ operations: [operation] }, (error, result) => {
      if (error) {
        logger.error('GoogleAdsService::enabledOrPauseTheCampaignByDevice::error', error);
        return reject(error);
      }
      logger.info('GoogleAdsService::enabledOrPauseTheCampaignByDevice::success', result);
      return resolve(result);
    });
  });
};

module.exports = {
  sendManagerRequest,
  getListCampaigns,
  addIpBlackList,
  removeIpBlackList,
  getPendingInvitations,
  mapManageCustomerErrorMessage,
  getAccountHierachy,
  getErrorCode,
  getReportOnDevice,
  enabledOrPauseTheCampaignByDevice
};
