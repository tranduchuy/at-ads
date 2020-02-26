const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const AdwordsUser = require('node-adwords').AdwordsUser;
const adwordConfig = require('config').get('google-ads');
const AdwordsConstants = require('node-adwords').AdwordsConstants;
const ManagerCustomerMsgs = require('../constants/ManagerCustomerMsgs');
const AdwordsReport = require('node-adwords').AdwordsReport;
const config = require('config');
const GoogleAdsErrorService = require('../modules/google-ads-error/google-ads-error.service');
const RabbitMQService = require('./rabbitmq.service');
const { COUNT } = require('../modules/count-request-google/count-request-google.constant');
const RabbitChannels = config.get('rabbitChannels');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const UserModel = require('../modules/user/user.model');
const AdAccountConstant = require('../modules/account-adwords/account-ads.constant');
const moment = require('moment');
const UrlTrackingTemplateConstant = require('../constants/url-tracking-template.constant');

const getRefreshToken = async (adwordId) => {
	logger.info('GoogleAdsService::getRefreshToken is called.', {adwordId});
	try{
    const adsAccount = await AccountAdsModel.findOne({adsId: adwordId});

    if( !adsAccount || !adsAccount.connectType || adsAccount.connectType == AdAccountConstant.connectType.byId )
    {
      return null;
    }

    const user = await UserModel.findOne({_id: adsAccount.user});

		if(!user)
		{
			return null;
		}

		const now  = moment();
		const tokenExpiresAt = user.expiryDateOfRefreshToken;

    if(user.googleRefreshToken == '' || !user.googleRefreshToken || !tokenExpiresAt || now.isAfter(moment(tokenExpiresAt)) || !user.isRefreshTokenValid)
    {
			user.isRefreshTokenValid = false;
			await user.save();
      return null;
    }

		return user.googleRefreshToken;
	}catch(e){
    logger.error('GoogleAdsService::getRefreshToken error.', e, {adwordId});
		throw e;
	}
};

/**
 * Send request to manage an adword id
 * @param {string} accountAdsId
 * @return {Promise<any>}
 */
const sendManagerRequest = function (accountAdsId) {
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		logger.info('GoogleAdsService::sendManagerRequest', accountAdsId);
		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : adwordConfig.refresh_token,
			clientCustomerId: adwordConfig.clientCustomerId,
		};

		const user = new AdwordsUser(authConfig);
		const ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
		const operation = {
			operator: 'ADD',
			operand : {
				managerCustomerId     : adwordConfig.managerCustomerId,
				clientCustomerId      : accountAdsId,
				linkStatus            : 'PENDING',
				pendingDescriptiveName: adwordConfig.pendingDescriptiveName,
				isHidden              : false
			}
		};
		const params = { operations: [operation] };

		ManagedCustomerService.mutateLink(params, (error, result) => {
			if (error) {
				logger.error('GoogleAdsService::sendManagerRequest::error', error);
				GoogleAdsErrorService.createLogError({
					authConfig,
					params,
					functionName  : 'GoogleAdsService::sendManagerRequest',
					error,
					serviceVersion: adwordConfig.version,
					serviceName   : 'ManagedCustomerService',
					moduleName    : 'AdwordsUser'
				});
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
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::getListCampaigns', adwordId);

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);

		let campaignService = user.getService('CampaignService', adwordConfig.version);
		const selector = {
			fields  : ['Id', 'Name', 'Status', 'ServingStatus', 'TargetGoogleSearch', 'AdvertisingChannelSubType', 'AdvertisingChannelType', 'TrackingUrlTemplate'],
			ordering: [{ field: 'Name', sortOrder: 'ASCENDING' }],
			paging  : { startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE }
		};
		const params = { serviceSelector: selector };

		campaignService.get(params, (error, result) => {
			if (error) {
				logger.error('GoogleAdsService::getListCampaigns::error', error);
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getListCampaigns',
					error,
					params,
					serviceName   : 'CampaignService',
					moduleName    : 'AdwordsUser'
				});
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
 * Get list campaign of an adword id
 * @param {string} adwordId
 * @param {string[]} campaignIds
 * @return {Promise<[{id: string, name: string}]>}
 */
const getCampaignsName = function (adwordId, campaignIds) {
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::getCampaignsName', adwordId);

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const campaignService = user.getService('CampaignService', adwordConfig.version);
		const selector = {
			fields    : ['Id', 'Name'],
			predicates: [{ field: 'Id', operator: 'IN', values: campaignIds }],
		};
		const params = { serviceSelector: selector };

		campaignService.get(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getCampaignsName',
					error,
					params,
					serviceName   : 'CampaignService',
					moduleName    : 'AdwordsUser'
				});
				logger.error('GoogleAdsService::getCampaignsName::error', error);
				return reject(error);
			}

			logger.info('GoogleAdsService::getCampaignsName::success', result);
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
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::addIpBlackList', adwordId, campaignId, ipAddress);

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
		const operation = {
			operator: 'ADD',
			operand : {
				campaignId: campaignId,
				criterion : {
					type      : 'IP_BLOCK',
					'xsi:type': 'IpBlock',
					ipAddress : ipAddress,
				},
				'xsi:type': 'NegativeCampaignCriterion'
			}
		};
		const params = { operations: [operation] };

		CampaignCriterionService.mutate(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::addIpBlackList',
					error,
					params,
					serviceName   : 'CampaignCriterionService',
					moduleName    : 'AdwordsUser'
				});
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
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::removeIpBlackList', adwordId, campaignId, ipAddress);

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
		const operation = {
			operator: 'REMOVE',
			operand : {
				campaignId: campaignId,
				criterion : {
					id        : idCriterion,
					type      : 'IP_BLOCK',
					'xsi:type': 'IpBlock',
					ipAddress : ipAddress,
				},
				'xsi:type': 'NegativeCampaignCriterion'
			}
		};
		const params = { operations: [operation] };

		CampaignCriterionService.mutate(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::removeIpBlackList',
					error,
					params,
					serviceName   : 'CampaignCriterionService',
					moduleName    : 'AdwordsUser'
				});
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
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		const user = new AdwordsUser({
			developerToken: adwordConfig.developerToken,
			userAgent     : adwordConfig.userAgent,
			client_id     : adwordConfig.client_id,
			client_secret : adwordConfig.client_secret,
			refresh_token : adwordConfig.refresh_token,
		});

		const ManagedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
		ManagedCustomerService.getPendingInvitations({ selector: {} }, (error, result) => {
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
	logger.info('GoogleAdsService::mapManageCustomerErrorMessage::info', { reason });

	return ManagerCustomerMsgs[reason];
};

/**
 * Get list campaign of an adword id
 * @param {string} adwordId
 * @return {Promise<[{id: string, name: string}]>}
 */
const getAccountHierachy = function (refreshToken, adwordId) {
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::getAccountHierachy', adwordId);

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		// const adwordConfig = config.get('google-ads');
		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : refreshToken,
			clientCustomerId: adwordId
		};
		const user = new AdwordsUser(authConfig);
		const managedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
		const selector = {
			fields  : ['CustomerId', 'Name'],
			ordering: [{ field: 'CustomerId', sortOrder: 'ASCENDING' }],
			paging  : { startIndex: 0, numberResults: AdwordsConstants.RECOMMENDED_PAGE_SIZE }
		};
		const params = { serviceSelector: selector };

		managedCustomerService.get(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getAccountHierachy',
					error,
					params,
					serviceName   : 'ManagedCustomerService',
					moduleName    : 'AdwordsUser'
				});
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
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.isReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const report = new AdwordsReport(authConfig);
		const params = {
			reportName   : 'Custom Adgroup Performance Report',
			reportType   : 'CAMPAIGN_PERFORMANCE_REPORT',
			fields,
			filters      : [
				{ field: 'CampaignStatus', operator: 'IN', values: ['ENABLED', 'PAUSED'] },
				{ field: 'CampaignId', operator: 'IN', values: campaignIds }
			],
			dateRangeType: 'CUSTOM_DATE',
			startDate,
			endDate,
			format       : 'CSV'
		};

		report.getReport(adwordConfig.version, params, (error, report) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: '',
					authConfig,
					functionName  : 'GoogleAdsService::getReportOnDevice',
					error,
					params,
					moduleName    : 'AdwordsReport'
				});
				logger.error('GoogleAdsService::getReportOnDevice::error', error);
				return reject(error);
			}
			logger.info('GoogleAdsService::getReportOnDevice::success', report);
			return resolve(report);
		});
	});
};

const enabledOrPauseTheCampaignByDevice = (adwordId, campaignId, criterionId, bidModifier) => {
	const info = { adwordId, campaignId, criterionId, bidModifier }
	logger.info('GoogleAdsService::enabledOrPauseTheCampaignByDevice', info);
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
		const operation = {
			operator: 'SET',
			operand : {
				campaignId: campaignId,
				criterion : {
					id  : criterionId,
					type: 'INTERACTION_TYPE',
				},
				bidModifier
			}
		};
		const params = { operations: [operation] };

		CampaignCriterionService.mutate(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::enabledOrPauseTheCampaignByDevice',
					error,
					params,
					serviceName   : 'CampaignCriterionService',
					moduleName    : 'AdwordsUser'
				});
				logger.error('GoogleAdsService::enabledOrPauseTheCampaignByDevice::error', error);
				return reject(error);
			}
			logger.info('GoogleAdsService::enabledOrPauseTheCampaignByDevice::success', result);
			return resolve(result);
		});
	});
};

const getIpBlockOfCampaigns = (adwordId, campaignIds) => {
	const info = { adwordId, campaignIds }
	logger.info('GoogleAdsService::getIpBlockOfCampaign', info);
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
		const selector = {
			fields    : ['IpAddress'],
			predicates: [{ field: 'CampaignId', operator: 'IN', values: campaignIds }],
		};
		const params = { serviceSelector: selector };


		CampaignCriterionService.get(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getIpBlockOfCampaign',
					error,
					params,
					serviceName   : 'CampaignCriterionService',
					moduleName    : 'AdwordsUser'
				});
				logger.error('GoogleAdsService::getIpBlockOfCampaign::error', error);
				return reject(error);
			}

			logger.info('GoogleAdsService::getIpBlockOfCampaign::success', result);
			if (result.entries) {
				return resolve(result.entries);
			}

			return resolve([]);
		});
	});
};

const getListGoogleAdsAccount = (accessToken, refreshToken) => {
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		// const googleAdAccount = config.get('google-ads');
		const authConfig = {
			developerToken: adwordConfig.developerToken,
			userAgent     : adwordConfig.userAgent,
			client_id     : adwordConfig.client_id,
			client_secret : adwordConfig.client_secret,
			refresh_token : refreshToken,
			access_token  : accessToken
		};

		const user = new AdwordsUser(authConfig);
		let customerService = user.getService('CustomerService', 'v201809');

		customerService.getCustomers({}, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getListGoogleAdsAccount',
					error,
					params        : {},
					serviceName   : 'CustomerService',
					moduleName    : 'AdwordsUser'
				});
				return reject(error);
			}

			return resolve(result);
		});
	})
};

const getClickReport = (adwordId, campaignIds, fields) => {
  logger.info('GoogleAdsService::getClickReport', {adwordId, campaignIds, fields});
  return new Promise(async (resolve, reject) => {

	await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.isReport, number: 1 });
	const googleRefreshToken = await getRefreshToken(adwordId);

    const report = new AdwordsReport({
      developerToken  : adwordConfig.developerToken,
      userAgent       : adwordConfig.userAgent,
      client_id       : adwordConfig.client_id,
      client_secret   : adwordConfig.client_secret,
      refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
      clientCustomerId: adwordId,
    });
    report.getReport(adwordConfig.version, {
      reportName: 'Click Performace report',
      reportType: 'CLICK_PERFORMANCE_REPORT',
      fields,
      filters: [
        { field: 'CampaignStatus', operator: 'IN', values: ['ENABLED', 'PAUSED'] },
		{ field: 'CampaignId', operator: 'IN', values: campaignIds }
      ],
      dateRangeType: 'YESTERDAY',
      format: 'TSV',
      additionalHeaders: {
          skipReportHeader: true,
          skipReportSummary: true
      }
    }, (error, report) => {
      if (error) {
		logger.error('GoogleAdsService::getClickReport::error', error);
		GoogleAdsErrorService.createLogError({
			serviceVersion: adwordConfig.version,
			report,
			functionName  : 'GoogleAdsService::getClickReport',
			error,
			params        : {adwordId, campaignIds, fields},
			serviceName   : 'CLICK_PERFORMANCE_REPORT',
			moduleName    : 'AdwordsReport'
		});
        return reject(error);
      }
      logger.info('GoogleAdsService::getClickReport::success', report);
      return resolve(report);
    });
  });
};

const getKeywordsReport = (adwordId, campaignIds, fields) => {
	logger.info('GoogleAdsService::getKeywordsReport', {adwordId, campaignIds, fields});
	return new Promise(async (resolve, reject) => {

	await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.isReport, number: 1 });
	const googleRefreshToken = await getRefreshToken(adwordId);

	const report = new AdwordsReport({
		developerToken  : adwordConfig.developerToken,
		userAgent       : adwordConfig.userAgent,
		client_id       : adwordConfig.client_id,
		client_secret   : adwordConfig.client_secret,
		refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
		clientCustomerId: adwordId,
	});
	report.getReport(adwordConfig.version, {
		reportName: 'Keywords Performace report',
		reportType: 'KEYWORDS_PERFORMANCE_REPORT',
		fields,
		filters: [
		  { field: 'CampaignStatus', operator: 'IN', values: ['ENABLED', 'PAUSED'] },
		  { field: 'CampaignId', operator: 'IN', values: campaignIds }
		],
		dateRangeType: 'YESTERDAY',
		format: 'CSV',
		additionalHeaders: {
			skipReportHeader: true,
			skipReportSummary: true
		}
	}, (error, report) => {
		if (error) {
		  logger.error('GoogleAdsService::getKeywordsReport::error', error);
		  GoogleAdsErrorService.createLogError({
			serviceVersion: adwordConfig.version,
			report,
			functionName  : 'GoogleAdsService::getKeywordsReport',
			error,
			params        : {adwordId, campaignIds, fields},
			serviceName   : 'KEYWORDS_PERFORMANCE_REPORT',
			moduleName    : 'AdwordsReport'
		  });
		  return reject(error);
		}
		logger.info('GoogleAdsService::getKeywordsReport::success', report);
		return resolve(report);
	  });
	});
};

const getAdWordsName = (adwordId) => {
	const info = { adwordId }
	logger.info('GoogleAdsService::getAdWordsName', info);
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const managedCustomerService = user.getService('ManagedCustomerService', adwordConfig.version);
		const selector = {
			fields    : ['CustomerId', 'Name']
		};
		const params = { serviceSelector: selector };

		managedCustomerService.get(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getAdWordsName',
					error,
					params,
					serviceName   : 'ManagedCustomerService',
					moduleName    : 'AdwordsUser'
				});
				logger.error('GoogleAdsService::getAdWordsName::error', error);
				return reject(error);
			}

			logger.info('GoogleAdsService::getAdWordsName::success', result);
			if (result.entries) {
				return resolve(result.entries);
			}
			return resolve([]);
		});
	});
};

const getkeyWords = (adwordId) => {
	const info = { adwordId }
	logger.info('GoogleAdsService::getkeyWords', info);
	return new Promise(async (resolve, reject) => {

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};
		const user = new AdwordsUser(authConfig);
		const managedCustomerService = user.getService('AdGroupCriterionService', adwordConfig.version);
		const selector = {
			fields    : ['Id', 'KeywordMatchType', 'KeywordText', 'SystemServingStatus']
		};
		const params = { serviceSelector: selector };

		managedCustomerService.get(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::getkeyWords',
					error,
					params,
					serviceName   : 'AdGroupCriterionService',
					moduleName    : 'AdwordsUser'
				});

				logger.error('GoogleAdsService::getkeyWords::error', error);
				return reject(error);
			}

			logger.info('GoogleAdsService::getkeyWords::success', result);
			if (result.entries) {
				return resolve(result.entries);
			}
			return resolve([]);
		});
	});
};

const setTrackingUrlTemplateForCampaign = (adwordId, campaignIds) => {
	return new Promise(async (resolve, reject) => {
		logger.info('GoogleAdsService::setTrackingUrlTemplateForCampaign', { adwordId, campaignIds });

		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: campaignIds.length });
		const googleRefreshToken = await getRefreshToken(adwordId);

		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: adwordId,
		};

		const user = new AdwordsUser(authConfig);
		const CampaignService = user.getService('CampaignService', adwordConfig.version);

		let operations = [];

		campaignIds.forEach(campaignId => {
			operations.push({
				operator: 'SET',
				operand : {
					id                 : campaignId,
					trackingUrlTemplate: ''
				}
			});
		});

		const params = { operations };

		CampaignService.mutate(params, (error, result) => {
			if (error) {
				GoogleAdsErrorService.createLogError({
					serviceVersion: adwordConfig.version,
					authConfig,
					functionName  : 'GoogleAdsService::setTrackingUrlTemplateForCampaign',
					error,
					params,
					serviceName   : 'CampaignService',
					moduleName    : 'AdwordsUser'
				});
				logger.error('GoogleAdsService::setTrackingUrlTemplateForCampaign::error', error);
				return reject(error);
			}

			logger.info('GoogleAdsService::setTrackingUrlTemplateForCampaign::success', result);
			return resolve(result);
		});
	});
};

const addIpBlackListToCampaigns = function (adwordId, campaignIds, ips) {
	return new Promise(async (resolve, reject) => {
		try{
			logger.info('GoogleAdsService::addIpBlackListToCampaigns', adwordId, campaignIds, ips);

			await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: campaignIds.length * ips.length });
			const googleRefreshToken = await getRefreshToken(adwordId);

			const authConfig = {
				developerToken  : adwordConfig.developerToken,
				userAgent       : adwordConfig.userAgent,
				client_id       : adwordConfig.client_id,
				client_secret   : adwordConfig.client_secret,
				refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
				clientCustomerId: adwordId,
			};
			const user = new AdwordsUser(authConfig);
			const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);

			let operations = [];

			campaignIds.forEach(campaignId => {
				ips.forEach(ip => {
					operations.push({
						operator: 'ADD',
						operand : {
							campaignId: campaignId,
							criterion : {
								type      : 'IP_BLOCK',
								'xsi:type': 'IpBlock',
								ipAddress : ip,
							},
							'xsi:type': 'NegativeCampaignCriterion'
						}
					});
				})
			});
			const params = { operations };

			CampaignCriterionService.mutate(params, (error, result) => {
				if (error) {
					GoogleAdsErrorService.createLogError({
						serviceVersion: adwordConfig.version,
						authConfig,
						functionName  : 'GoogleAdsService::addIpBlackListToCampaigns',
						error,
						params,
						serviceName   : 'CampaignCriterionService',
						moduleName    : 'AdwordsUser'
					});
					logger.error('GoogleAdsService::addIpBlackListToCampaigns::error', error);
					return reject(error);
				}

				logger.info('GoogleAdsService::addIpBlackListToCampaigns::success', result);
				return resolve(result);
			});
		}catch(e){
			logger.error('GoogleAdsService::addIpBlackListToCampaigns::error', e);
			return reject(e);
		}
	});
};

const getIpOnGoogleFilteredByCampaignsAndIps = (adwordId, campaignIds, ips) => {
	const info = { adwordId, campaignIds, ips }
	logger.info('GoogleAdsService::getIpOnGoogleFilteredByCampaignsAndIps', info);
	return new Promise(async (resolve, reject) => {
		try{
			await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });
			const googleRefreshToken = await getRefreshToken(adwordId);

			const authConfig = {
				developerToken  : adwordConfig.developerToken,
				userAgent       : adwordConfig.userAgent,
				client_id       : adwordConfig.client_id,
				client_secret   : adwordConfig.client_secret,
				refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
				clientCustomerId: adwordId,
			};
			const user = new AdwordsUser(authConfig);
			const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);
			const selector = {
				fields    : ['IpAddress', 'CampaignId'],
				predicates: [
					{ field: 'CampaignId', operator: 'IN', values: campaignIds },
					{ field: 'IpAddress', operator: 'IN', values: ips }
				],
			};
			const params = { serviceSelector: selector };


			CampaignCriterionService.get(params, (error, result) => {
				if (error) {
					GoogleAdsErrorService.createLogError({
						serviceVersion: adwordConfig.version,
						authConfig,
						functionName  : 'GoogleAdsService::getIpOnGoogleFilteredByCampaignsAndIps',
						error,
						params,
						serviceName   : 'CampaignCriterionService',
						moduleName    : 'AdwordsUser'
					});
					logger.error('GoogleAdsService::getIpOnGoogleFilteredByCampaignsAndIps::error', error);
					return reject(error);
				}

				logger.info('GoogleAdsService::getIpOnGoogleFilteredByCampaignsAndIps::success', result);
				if (result.entries) {
					return resolve(result.entries);
				}

				return resolve([]);
			});
		}catch(e){
			logger.error('GoogleAdsService::getIpOnGoogleFilteredByCampaignsAndIps::error', e);
			return reject(e);
		}
	});
};

const removeIpBlackListToCampaigns = (adwordId, campaignsInfo) => {
	return new Promise(async (resolve, reject) => {
		try{
			logger.info('GoogleAdsService::removeIpBlackListToCampaigns', adwordId);

			await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: campaignsInfo.length });
			const googleRefreshToken = await getRefreshToken(adwordId);

			const authConfig = {
				developerToken  : adwordConfig.developerToken,
				userAgent       : adwordConfig.userAgent,
				client_id       : adwordConfig.client_id,
				client_secret   : adwordConfig.client_secret,
				refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
				clientCustomerId: adwordId,
			};
			const user = new AdwordsUser(authConfig);
			const CampaignCriterionService = user.getService('CampaignCriterionService', adwordConfig.version);

			let operations = [];

			campaignsInfo.forEach(campaign => {
				const operation = {
					operator: 'REMOVE',
					operand : {
						campaignId: campaign.campaignId,
						criterion : {
							id        : campaign.criterionId,
							type      : 'IP_BLOCK',
							'xsi:type': 'IpBlock',
							ipAddress : campaign.ip,
						},
						'xsi:type': 'NegativeCampaignCriterion'
					}
				};

				operations.push(operation);
			})

			const params = { operations };

			CampaignCriterionService.mutate(params, (error, result) => {
				if (error) {
					GoogleAdsErrorService.createLogError({
						serviceVersion: adwordConfig.version,
						authConfig,
						functionName  : 'GoogleAdsService::removeIpBlackListToCampaigns',
						error,
						params,
						serviceName   : 'CampaignCriterionService',
						moduleName    : 'AdwordsUser'
					});
					logger.error('GoogleAdsService::removeIpBlackListToCampaigns::error', error);
					return reject(error);
				}
				logger.info('GoogleAdsService::removeIpBlackListToCampaigns::success', result);
				return resolve(result);
			});
		}catch(e){
			logger.error('GoogleAdsService::removeIpBlackListToCampaigns::error', e);
			return reject(e);
		}
	});
};

const setUrlTrackingTemplateForAccount = (accountAdsId) => {
	return new Promise(async (resolve, reject) => {
		await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		logger.info('GoogleAdsService::setUrlTrackingTemplateForAccount', accountAdsId);
		const googleRefreshToken = await getRefreshToken(accountAdsId);
		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: accountAdsId,
		};

		const user = new AdwordsUser(authConfig);
		const hostApi = config.get('hostApi');;
		const customerService = user.getService('CustomerService', adwordConfig.version);
		const customer = {
			'autoTaggingEnabled': true,
			'parallelTrackingEnabled': true,
			'trackingUrlTemplate': `${hostApi}user-behaviors/${UrlTrackingTemplateConstant.URL_TRACKING_TEMPLATE}`,
			'finalUrlSuffix': 'gclid={gclid}'
		};

		customerService.mutate({customer}, (error, result) => {
			if (error) {
				logger.error('GoogleAdsService::setUrlTrackingTemplateForAccount::error', error);
				GoogleAdsErrorService.createLogError({
					authConfig,
					params: customer,
					functionName  : 'GoogleAdsService::setUrlTrackingTemplateForAccount',
					error,
					serviceVersion: adwordConfig.version,
					serviceName   : 'CustomerService',
					moduleName    : 'AdwordsUser'
				});
				return reject(error);
			}

			logger.info('GoogleAdsService::setUrlTrackingTemplateForAccount::result', result);
			return resolve(result);
		});
	});
};

const getInfoCustomer = (accountAdsId) => {
	return new Promise(async (resolve, reject) => {
		// await RabbitMQService.sendMessages(RabbitChannels.COUNT_REQUEST_GOOGLE, { count: COUNT.notReport, number: 1 });

		logger.info('GoogleAdsService::setUrlTrackingTemplateForAccount', accountAdsId);
		const googleRefreshToken = await getRefreshToken(accountAdsId);
		const authConfig = {
			developerToken  : adwordConfig.developerToken,
			userAgent       : adwordConfig.userAgent,
			client_id       : adwordConfig.client_id,
			client_secret   : adwordConfig.client_secret,
			refresh_token   : googleRefreshToken || adwordConfig.refresh_token,
			clientCustomerId: accountAdsId,
		};

		const user = new AdwordsUser(authConfig);
		const customerService = user.getService('CustomerService', adwordConfig.version);

		customerService.getCustomers({}, (error, result) => {
			if (error) {
				logger.error('GoogleAdsService::setUrlTrackingTemplateForAccount::error', error);
				GoogleAdsErrorService.createLogError({
					authConfig,
					params: customer,
					functionName  : 'GoogleAdsService::setUrlTrackingTemplateForAccount',
					error,
					serviceVersion: adwordConfig.version,
					serviceName   : 'CustomerService',
					moduleName    : 'AdwordsUser'
				});
				return reject(error);
			}

			logger.info('GoogleAdsService::setUrlTrackingTemplateForAccount::result', result);
			return resolve(result);
		});
	});
};

module.exports = {
  sendManagerRequest,
  getListCampaigns,
  getListGoogleAdsAccount,
  addIpBlackList,
  removeIpBlackList,
  getPendingInvitations,
  mapManageCustomerErrorMessage,
  getAccountHierachy,
  getErrorCode,
  getReportOnDevice,
  enabledOrPauseTheCampaignByDevice,
  getCampaignsName,
  getIpBlockOfCampaigns,
  getClickReport,
	getKeywordsReport,
	getAdWordsName,
	getkeyWords,
	setTrackingUrlTemplateForCampaign,
	addIpBlackListToCampaigns,
	getIpOnGoogleFilteredByCampaignsAndIps,
	removeIpBlackListToCampaigns,
	setUrlTrackingTemplateForAccount,
	getInfoCustomer
};
