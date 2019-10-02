const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const HttpStatus = require('http-status-codes');
const AccountAdsModel = require('./account-ads.model');
const BlockingCriterionsModel = require('../blocking-criterions/blocking-criterions.model');
const UserBehaviorLogModel = require('../user-behavior-log/user-behavior-log.model');
const messages = require("../../constants/messages");
const ActionConstant = require('../../constants/action.constant');
const mongoose = require('mongoose');

const CriterionIdOfDevice = require('../../constants/criterionIdOfDevice.constant')
const userActionHistoryService = require('../user-action-history/user-action-history.service');
const AdAccountConstant = require('./account-ads.constant');
const AccountAdsService = require("./account-ads.service");
const { checkIpsInWhiteList } = require('../../services/check-ip-in-white-list.service');
const { checkWhiteListIpsExistsInBlackList } = require('../../services/check-ip-in-white-list.service');
const requestUtil = require('../../utils/RequestUtil');

const UserBehaviorLogService = require('../user-behavior-log/user-behavior-log.service');
const ClickReportService = require('../click-report/click-report.service');

const { BlockByPrivateBrowserValidationSchema } = require('./validations/block-by-private-browser.schema');
const { AddAccountAdsValidationSchema } = require('./validations/add-account-ads.schema');
const { blockIpsValidationSchema } = require('./validations/blockIps-account-ads.schema');
const { AutoBlockingIpValidationSchema } = require('./validations/auto-blocking-ip.schema');
const { AutoBlocking3g4gValidationSchema } = require('./validations/auto-blocking-3g4g.schema');
const { AutoBlockingRangeIpValidationSchema } = require('./validations/auto-blocking-range-ip.schema');
const { AddCampaingsValidationSchema } = require('./validations/add-campaings-account-ads.chema');
const { sampleBlockingIpValidationSchema } = require('./validations/sample-blocking-ip.schema');
const { CheckDate } = require('./validations/check-date.schema');
const { getListGoogleAdsOfUserValidationSchema } = require('./validations/get-list-google-ads-of-user.schema');
const { setUpCampaignsByOneDeviceValidationSchema } = require('./validations/set-up-campaign-by-one-device.schema');
const { getReportForAccountValidationSchema } = require('./validations/get-report-for-account.schema');
const { getDailyClickingValidationSchema } = require('./validations/get-daily-clicking.shema');
const { getIpsInfoInClassDValidationSchema } = require('./validations/get-ips-info-in-ClassD.schema');
const { removeIpInAutoBlackListValidationSchema } = require('./validations/remove-Ip-In-Auto-Black-List-Ip.schema');
const { getIpHistoryValidationSchema } = require('./validations/get-ip-history.schema');
const { getReportStatisticValidationSchema } = require('./validations/get-report-Statistic.schema');
const { connectGoogleAdsByEmailValidationSchema } = require('./validations/connect-google-ads-by-email.schema');

const GoogleAdwordsService = require('../../services/GoogleAds.service');
const Async = require('async');
const _ = require('lodash');
const ManagerCustomerMsgs = require('../../constants/ManagerCustomerMsgs');
const { Paging } = require('./account-ads.constant');
const moment = require('moment');
const { VerifyAcctachedCodeDomainsValidationSchema } = require('./validations/verify-acctached-code-domains.schema');

const WebsiteModel = require('../website/website.model');

const addAccountAds = async (req, res, next) => {
	logger.info('AccountAdsController::addAccountAds is called');
	try {
		const { error } = Joi.validate(req.body, AddAccountAdsValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { adWordId } = req.body;
		const duplicateAdWordId = await AccountAdsModel.findOne({ adsId: adWordId });

		if (duplicateAdWordId) {
			if (duplicateAdWordId.user.toString() !== req.user._id.toString()) {
				const result = {
					messages: [messages.ResponseMessages.AccountAds.Register.ADWORDS_ID_BELONG_TO_ANOTHER_USER],
				};
				return res.status(HttpStatus.BAD_REQUEST).json(result);
			}

			GoogleAdwordsService.sendManagerRequest(adWordId)
				.then(async result => {
					if (!result || !result.links) {
						logger.error('AccountAdsController::addAccountAds::error', result);

						return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
							messages: ['Gửi request quản lý tài khoản Google Ads không thành công']
						});
					}

					duplicateAdWordId.isDeleted = false;
					duplicateAdWordId.isConnected = false;
					await duplicateAdWordId.save();
					logger.info('AccountAdsController::addAccountAds::success', result);
					return res.status(HttpStatus.OK).json({
						messages: ['Đã gửi request đến tài khoản Google Ads của bạn, vui lòng truy cập và chấp nhập'],
						data    : {
							account  : duplicateAdWordId,
							isRefresh: false
						}
					});
				})
				.catch(async error => {
					switch (GoogleAdwordsService.getErrorCode(error)) {
						case 'ALREADY_MANAGED_BY_THIS_MANAGER':
							if (!duplicateAdWordId.isDeleted && duplicateAdWordId.isConnected) {
								return res.status(HttpStatus.BAD_REQUEST).json({
									messages: ['Bạn đã kết nối tài khoản này: ' + duplicateAdWordId.adsId]
								});
							}

							duplicateAdWordId.isDeleted = false;
							duplicateAdWordId.isConnected = true;
							await duplicateAdWordId.save();

							logger.info('AccountAdsController::addAccountAds::reconnect success', duplicateAdWordId);
							return res.status(HttpStatus.OK).json({
								messages: ['Kết nối tài khoản thành công'],
								data    : {
									account  : duplicateAdWordId,
									isRefresh: true
								}
							});
						case 'ALREADY_INVITED_BY_THIS_MANAGER':
							duplicateAdWordId.isDeleted = false;
							duplicateAdWordId.isConnected = false;
							await duplicateAdWordId.save();
							logger.info('AccountAdsController::addAccountAds::reinvite success', duplicateAdWordId);
							return res.status(HttpStatus.OK).json({
								messages: ['Đã gửi request đến tài khoản Google Ads của bạn, vui lòng truy cập và chấp nhập'],
								data    : {
									account  : duplicateAdWordId,
									isRefresh: false
								}
							});
						default:
							const message = GoogleAdwordsService.mapManageCustomerErrorMessage(error);
							logger.info('AccountAdsController::addAccountAds::error', JSON.stringify(error));
							return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
								messages: [message]
							});
					}
				});
		} else {
			GoogleAdwordsService.sendManagerRequest(adWordId)
				.then(async result => {
					if (!result || !result.links) {
						logger.error('AccountAdsController::addAccountAds::error', result);

						return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
							messages: ['Gửi request quản lý tài khoản Google Ads không thành công']
						});
					}

					const account = await AccountAdsService.createAccountAds({ userId: req.user._id, adsId: adWordId });
					logger.info('AccountAdsController::addAccountAds::success', result);
					return res.status(HttpStatus.OK).json({
						messages: ['Đã gửi request đến tài khoản Google Ads của bạn, vui lòng truy cập và chấp nhập'],
						data    : {
							account,
							isRefresh: false
						}
					});
				})
				.catch(async error => {
					switch (GoogleAdwordsService.getErrorCode(error)) {
						case 'ALREADY_MANAGED_BY_THIS_MANAGER':
							const account = await AccountAdsService.createAccountAdsHaveIsConnectedStatus({
								userId: req.user._id,
								adsId : adWordId
							}, true);

							logger.info('AccountAdsController::addAccountAds::reconnect success', {
								userId: req.user._id,
								adsId : adWordId
							});
							return res.status(HttpStatus.OK).json({
								messages: ['Kết nối tài khoản thành công'],
								data    : {
									account,
									isRefresh: true
								}
							});
						case 'ALREADY_INVITED_BY_THIS_MANAGER':
							const newAccount = await AccountAdsService.createAccountAds({ userId: req.user._id, adsId: adWordId });

							logger.info('AccountAdsController::addAccountAds::reinvite success', {
								userId: req.user._id,
								adsId : adWordId
							});
							return res.status(HttpStatus.OK).json({
								messages: ['Đã gửi request đến tài khoản Google Ads của bạn, vui lòng truy cập và chấp nhập'],
								data    : {
									account  : newAccount,
									isRefresh: false
								}
							});
						default:
							const message = GoogleAdwordsService.mapManageCustomerErrorMessage(error);
							logger.info('AccountAdsController::addAccountAds::error', JSON.stringify(error));
							return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
								messages: [message]
							});
					}
				});
		}
	} catch (e) {
		logger.error('AccountAdsController::addAccountAds::error', e);
		return next(e);
	}
};

const handleManipulationGoogleAds = async (req, res, next) => {
	const info = {
		_id   : req.adsAccount._id,
		adsId : req.adsAccount.adsId,
		action: req.body.action,
		ips   : req.body.ips
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::handleManipulationGoogleAds::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::handleManipulationGoogleAds is called\n', info);
	try {

		const { error } = Joi.validate(req.body, blockIpsValidationSchema);
		const { action, ips } = req.body;

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const arrAfterRemoveIdenticalElement = ips.filter(AccountAdsService.onlyUnique);
		const campaignIds = req.campaignIds || [];

		//ADD IPS IN CUSTOMBLACKLIST
		if (action === ActionConstant.ADD) {
			logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + ' is called\n', info);
			const ipInSampleBlocked = req.adsAccount.setting.sampleBlockingIp;
			const customBlackList = req.adsAccount.setting.customBlackList;
			const autoBlackListIp = req.adsAccount.setting.autoBlackListIp;
			const ipInwhiteList = req.adsAccount.setting.customWhiteList || [];
			const ipsArr = AccountAdsService.checkIpIsBlackListed(customBlackList, arrAfterRemoveIdenticalElement, ipInSampleBlocked, autoBlackListIp);
			const ipSampleArr = ipInSampleBlocked === '' ? [] : [ipInSampleBlocked];
			const allIps = customBlackList.concat(ipSampleArr, arrAfterRemoveIdenticalElement, autoBlackListIp);
			const ipsNumber = allIps.length;
			const maxIpsNumber = req.adsAccount.setting.maxIps || AdAccountConstant.setting.maxIps;
			
			console.log()
			if(ipsNumber >= ( maxIpsNumber - AdAccountConstant.ipsNumberForAutoBlackList))
			{
				logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + ' ::Ips number in DB greater than ips default number ');
				return res.status(HttpStatus.BAD_REQUEST).json({
					messages: ['Số lượng ip đã vượt quá số lượng ip cho phép! Vui lòng xóa ip để tiếp tục sử dụng chức năng này.']
				}) 
			}

			if (ipsArr.length !== 0) {
				logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::conflict\n', info);
				return res.status(HttpStatus.CONFLICT).json({
					messages: ['Ip đã có trong blacklist.'],
					data    : {
						ips: ipsArr
					}
				});
			}

			const checkIpInCustomWhiteList = checkIpsInWhiteList(arrAfterRemoveIdenticalElement, ipInwhiteList);

			if (!checkIpInCustomWhiteList.status) {
				logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::IpExistsInCustomWhiteList\n', info);
				return res.status(HttpStatus.CONFLICT).json({
					messages: ['Ip đang nằm trong whiteList.'],
					data    : {
						ips: checkIpInCustomWhiteList.ipsConflict
					}
				});
			}

			Async.eachSeries(campaignIds, (campaignId, callback) => {
				AccountAdsService.addIpsToBlackListOfOneCampaign(req.adsAccount._id, req.adsAccount.adsId, campaignId, arrAfterRemoveIdenticalElement, callback);
			}, err => {
				if (err) {
					logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::error', err, '\n', info);
					return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
						messages: ['Thêm ips vào blacklist không thành công.']
					});
				}

				const newBlackList = req.adsAccount.setting.customBlackList.concat(arrAfterRemoveIdenticalElement);

				req.adsAccount.setting.customBlackList = newBlackList;

				req.adsAccount.save(async err => {
					if (err) {
						logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::error', err, '\n', info);
						return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
							messages: ['Thêm ips vào blacklist không thành công.']
						});
					}
					logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.ADD + '::success\n', info);


					// log action history
					const actionHistory = {
						userId : req.user._id,
						content: " Chặn danh sách blacklist ip: " + info.ips.join(', '),
						param  : { ips: info.ips }
					};

					await userActionHistoryService.createUserActionHistory(actionHistory);
					return res.status(HttpStatus.OK).json({
						messages: ['Thêm ips vào blacklist thành công.']
					});
				});

			});
		}
		//REMOVE IPS IN CUSTOMBLACKLIST
		else {
			logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + ' is called\n', info);
			const blackList = req.adsAccount.setting.customBlackList || [];

			const checkIpsInBlackList = AccountAdsService.checkIpIsNotOnTheBlackList(blackList, arrAfterRemoveIdenticalElement);

			if (checkIpsInBlackList.length !== 0) {
				logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::notFound\n', info);
				return res.status(HttpStatus.NOT_FOUND).json({
					messages: ['Ip không nằm trong blacklist.'],
					data    : {
						ips: checkIpsInBlackList
					}
				});
			}

			Async.eachSeries(campaignIds, (campaignId, callback) => {
				AccountAdsService.removeIpsToBlackListOfOneCampaign(req.adsAccount._id, req.adsAccount.adsId, campaignId, arrAfterRemoveIdenticalElement, callback);
			}, err => {
				if (err) {
					logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::error', err, '\n', info);
					return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
						messages: ['Xóa ip không thành công.']
					});
				}

				const ipNotExistsInListArr = _.difference(blackList, arrAfterRemoveIdenticalElement);

				req.adsAccount.setting.customBlackList = ipNotExistsInListArr;
				req.adsAccount.save(async err => {
					if (err) {
						logger.error('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::error', err, '\n', info);
						return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
							messages: ['Xóa ip không thành công.']
						});
					}

					// log action history
					const actionHistory = {
						userId : req.user._id,
						content: " Xóa ip ra khỏi danh sách blacklist: " + info.ips.join(', '),
						param  : { ips: info.ips }
					};

					await userActionHistoryService.createUserActionHistory(actionHistory);
					logger.info('AccountAdsController::handleManipulationGoogleAds::' + ActionConstant.REMOVE + '::success\n', info);
					return res.status(HttpStatus.OK).json({
						messages: ['Xóa ip thành công.']
					});
				});
			});
		}
	} catch (e) {
		logger.error('AccountAdsController::handleManipulationGoogleAds::error', e, '\n', info);
		return next(e);
	}
};

const getAccountsAds = async (req, res, next) => {
	logger.info('AccountAdsController::getAccountsAds is called');
	try {
		const accounts = await AccountAdsService.getAccountsAdsByUserId(req.user._id);
		if (accounts !== null) {
			const response = {
				messages: [messages.ResponseMessages.SUCCESS],
				data    : {
					accounts: accounts
				}
			};
			logger.info('AccountAdsController::getAccountsAds::success');
			return res.status(HttpStatus.OK).json(response);
		}

		logger.info('AccountAdsController::getAccountsAds::account not found');
		const response = {
			messages: [messages.ResponseMessages.AccountAds.ACCOUNT_NOT_FOUND],
			data    : {}
		};
		return res.status(HttpStatus.NOT_FOUND).json(response);

	} catch (e) {
		logger.error('AccountAdsController::getAccountsAds::error', e);
		return next(e);
	}
};

const autoBlockIp = (req, res, next) => {
	const info = {
		_id       : req.adsAccount._id,
		adsId     : req.adsAccount.adsId,
		maxClick  : req.body.maxClick,
		autoRemove: req.body.autoRemove
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::autoBlockIp::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::autoBlockIp is called\n', info);
	try {
		const { error } = Joi.validate(req.body, AutoBlockingIpValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { maxClick, autoRemove, autoBlockWithAiAndBigData, countMaxClickInHours } = req.body;
		maxClick = Number(maxClick);

		if (maxClick == 0 || maxClick == -1) {
			req.adsAccount.setting.autoBlockByMaxClick = -1;
			req.adsAccount.setting.autoRemoveBlocking = false;
		} else {
			req.adsAccount.setting.autoBlockByMaxClick = maxClick;
			req.adsAccount.setting.autoRemoveBlocking = autoRemove;
		}

		req.adsAccount.setting.autoBlockWithAiAndBigData = autoBlockWithAiAndBigData;
		req.adsAccount.setting.countMaxClickInHours = countMaxClickInHours;

		req.adsAccount.save(async (err) => {
			if (err) {
				logger.error('AccountAdsController::autoBlockingIp::error', e, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ["Thiết lập không thành công"]
				});
			}

			// log action history
			const actionMessage = autoRemove ? "Tự động" : "Không tự động";
			const actionAutoBlockWithAiAndBigData = autoBlockWithAiAndBigData ? "Tự động" : "Không tự động";

			const actionHistory = {
				userId : req.user._id,
				content: `Cập nhật cấu hình chặn tự động ip: ${maxClick > 0 ? "maxclick = " + maxClick + ". " : ""} ${actionMessage} xóa ip hằng ngày. ${actionAutoBlockWithAiAndBigData} tự động chặn ip sử dụng AI và Big Data. Chặn ip đang click trong vòng ${countMaxClickInHours} giờ`,
				param  : { autoRemove, maxClick, autoBlockWithAiAndBigData, countMaxClickInHours }
			};

			await userActionHistoryService.createUserActionHistory(actionHistory);

			logger.info('AccountAdsController::autoBlockingIp::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ["Thiết lập thành công"]
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::autoBlockingIp::error', e, '\n', info);
		return next(e);
	}
};

const autoBlockingRangeIp = (req, res, next) => {
	const info = {
		_id   : req.adsAccount._id,
		adsId : req.adsAccount.adsId,
		classC: req.body.classC,
		classD: req.body.classD
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::autoBlockingRangeIp::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::autoBlockingRangeIp is called\n', info);
	try {
		const { error } = Joi.validate(req.body, AutoBlockingRangeIpValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { classC, classD } = req.body;
		const rangeIp = { classC, classD };

		req.adsAccount.setting.autoBlackListIpRanges = rangeIp;

		req.adsAccount.save(async (err) => {
			if (err) {
				logger.error('AccountAdsController::autoBlockingRangeIp::error', e, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ["Thiết lập chặn ip theo nhóm không thành công"]
				});
			}

			// log action history
			const classCMessage = classC ? "Kích hoạt" : "Loại bỏ";


			const classDMessage = classD ? "Kích hoạt" : "Loại bỏ";

			const actionHistory = {
				userId : req.user._id,
				content: `${classCMessage} chặn theo dãy ip: 127.0.0.* (255 IP) / ${classDMessage} chặn theo dãy ip: IP 127.0.*.* (65.026 IP) `,
				param  : { classC, classD }
			};

			await userActionHistoryService.createUserActionHistory(actionHistory);
			logger.info('AccountAdsController::autoBlockingRangeIp::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ["Thiết lập chặn ip theo nhóm thành công"]
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::autoBlockingRangeIp::error', e, '\n', info);
		return next(e);
	}
};


const blockByPrivateBrowser = (req, res, next) => {
	const info = {
		_id           : req.adsAccount._id,
		adsId         : req.adsAccount.adsId,
		blockByPrivate: req.body.blockByPrivate
	};

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::blockByPrivateBrowser::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::blockByPrivateBrowser is called\n', info);
	try {
		const { error } = Joi.validate(req.body, BlockByPrivateBrowserValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { blockByPrivate } = req.body;

		req.adsAccount.setting.blockByPrivateBrowser = blockByPrivate;

		req.adsAccount.save(async (err) => {
			if (err) {
				logger.error('AccountAdsController::blockByPrivateBrowser::error', e, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ["Thiết lập chặn ip là trình ẩn danh thất bại"]
				});
			}

			// log action history
			const actionMessage = blockByPrivate ? "Kích hoạt" : "Loại bỏ";

			const actionHistory = {
				userId : req.user._id,
				content: "Cập nhật chặn theo ẩn danh: " + actionMessage,
				param  : { blockByPrivate }
			};

			await userActionHistoryService.createUserActionHistory(actionHistory);
			logger.info('AccountAdsController::blockByPrivateBrowser::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ["Thiết lập chặn ip là trình ẩn danh thành công"]
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::blockByPrivateBrowser::error', e, '\n', info);
		return next(e);
	}
};

const autoBlocking3g4g = (req, res, next) => {
	const info = {
		_id          : req.adsAccount._id,
		adsId        : req.adsAccount.adsId,
		viettel      : req.body.viettel,
		vinafone     : req.body.vinafone,
		mobifone     : req.body.mobifone,
		vietnammobile: req.body.vietnammobile,
		fpt          : req.body.fpt
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::autoBlocking3g4g::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::autoBlock3g4g is called\n', info);
	try {
		const { error } = Joi.validate(req.body, AutoBlocking3g4gValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { viettel, mobifone, vinafone, vietnammobile, fpt } = req.body;
		const mobiNetworks = { viettel, mobifone, vinafone, vietnammobile, fpt };

		req.adsAccount.setting.mobileNetworks = mobiNetworks;

		req.adsAccount.save(async (err) => {
			if (err) {
				logger.error('AccountAdsController::autoBlocking3g4g::error', e, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ["Thiết lập chặn ip theo 3G/4G không thành công"]
				});
			}
			logger.info('AccountAdsController::autoBlocking3g4g::success\n', info);


			// log action history
			const mobiNetworksNames = [];

			for (let [key, value] of Object.entries(mobiNetworks)) {
				if (value) {
					mobiNetworksNames.push(key);
				}
			}

			const actionHistory = {
				userId : req.user._id,
				content: "Thay đổi cấu hình chặn 3g,4g: " + mobiNetworksNames.join(', '),
				param  : mobiNetworks
			};

			await userActionHistoryService.createUserActionHistory(actionHistory);

			return res.status(HttpStatus.OK).json({
				messages: ["Thiết lập chặn ip theo 3G/4G thành công"]
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::autoBlocking3g4g::error', e, '\n', info);
		return next(e);
	}
};

const updateWhiteList = async (req, res, next) => {
	const info = {
		_id  : req.adsAccount._id,
		adsId: req.adsAccount.adsId,
		ips  : req.body.ips
	};

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::updateWhiteList::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::updateWhiteList is called\n', info);
	try {
		const { ips } = req.body;
		const adsAccount = req.adsAccount;

		const whiteList = [];

		for (const ip of ips) {
			const convertedIP = AccountAdsService.checkAndConvertIP(ip);
			if (!convertedIP) {
				const result = {
					messages: [`IP ${ip} không hợp lệ`],
					data    : {}
				};
				return res.status(HttpStatus.BAD_REQUEST).json(result);
			}
			whiteList.push(convertedIP);
		}

		const ipsArrAfterRemoveIdenticalElement = whiteList.filter(AccountAdsService.onlyUnique);
		const customBlackList = req.adsAccount.setting.customBlackList;
		const autoBlackListIp = req.adsAccount.setting.autoBlackListIp;
		const sampleBlockingIp = [];

		if (req.adsAccount.setting.sampleBlockingIp) {
			sampleBlockingIp.push(req.adsAccount.setting.sampleBlockingIp);
		}

		const blackList = customBlackList.concat(autoBlackListIp, sampleBlockingIp);
		const checkIpConflict = checkWhiteListIpsExistsInBlackList(blackList, ipsArrAfterRemoveIdenticalElement);

		if (!checkIpConflict.status) {
			logger.info('AccountAdsController::updateWhiteList::ipExistsInBlackList\n', info);
			return res.status(HttpStatus.CONFLICT).json({
				messages: ["ip đang nằm trong BlackList"],
				data    : {
					ips: checkIpConflict.ipsConflict.filter(AccountAdsService.onlyUnique)
				}
			});
		}

		adsAccount.setting.customWhiteList = ipsArrAfterRemoveIdenticalElement;

		// log action history
		const actionHistory = {
			userId : req.user._id,
			content: "Cập nhật danh sách whitelist ip: " + whiteList.join(', '),
			param  : whiteList
		};

		await userActionHistoryService.createUserActionHistory(actionHistory);

		await adsAccount.save();

		return res.status(HttpStatus.OK).json({
			messages: ["Thiết lập whitelist thành công"]
		});
	} catch (e) {
		logger.error('AccountAdsController::updateWhiteList::error', e, '\n', info);
		return next(e);
	}
};

const addCampaignsForAAccountAds = async (req, res, next) => {
	const info = {
		_id        : req.adsAccount._id,
		adsId      : req.adsAccount.adsId,
		campaignIds: req.body.campaignIds
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::addCampaignsForAAccountAds::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::addCampaignsForAAccountAds is called\n', info);
	try {
		const { error } = Joi.validate(req.body, AddCampaingsValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { campaignIds } = req.body;
		campaignIds = campaignIds.map(String);
		const campaignIdsAfterRemoveIdenticalElement = campaignIds.filter(AccountAdsService.onlyUnique);
		const accountId = req.adsAccount._id;
		const query = {
			accountId: accountId,
		};

		const campaigns = await BlockingCriterionsModel.find(query);
		let campaignsNotInExistsInDB = campaignIdsAfterRemoveIdenticalElement;

		if (campaigns.length !== 0) {
			const allCampaignId = campaigns.map(campaign => campaign.campaignId);
			const campaignIdHasDeletedStatusIsFalse = campaigns.filter(campaign => !campaign.isDeleted).map(c => c.campaignId);
			const campaignIdHasDeletedStatusIsTrue = campaigns.filter(campaign => campaign.isDeleted).map(c => c.campaignId);

			campaignsNotInExistsInDB = _.difference(campaignIdsAfterRemoveIdenticalElement, allCampaignId);
			const campaignsExistsInDB = _.intersection(campaignIdsAfterRemoveIdenticalElement, allCampaignId);
			const campaignIdHasDeletedStatusIsTrueAndExistsInDB = _.intersection(campaignIdHasDeletedStatusIsTrue, campaignsExistsInDB);
			const campainInDBAndNotInThePostingCampaign = _.difference(allCampaignId, campaignsExistsInDB);
			const campaignIdHasDeletedStatusIsFalseAndExistsInDB = _.intersection(campaignIdHasDeletedStatusIsFalse, campainInDBAndNotInThePostingCampaign);

			if (campaignIdHasDeletedStatusIsTrueAndExistsInDB.length !== 0) {
				const resultQuery = await AccountAdsService.updateIsDeletedStatus(accountId, campaignIdHasDeletedStatusIsTrueAndExistsInDB, false);
			}

			if (campaignIdHasDeletedStatusIsFalseAndExistsInDB !== 0) {
				const resultQuery = await AccountAdsService.updateIsDeletedStatus(accountId, campaignIdHasDeletedStatusIsFalseAndExistsInDB, true);
			}
		}

		if (campaignsNotInExistsInDB.length === 0) {

			if(campaignIdsAfterRemoveIdenticalElement.length > 0)
			{
				await AccountAdsService.backUpIpOnGoogleAds(req.adsAccount, campaignIdsAfterRemoveIdenticalElement);
			}

			logger.info('AccountAdsController::addCampaignsForAAccountAds::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ["Thêm chiến dịch thành công"]
			});
		}

		const campaignsArr = AccountAdsService.createdCampaignArr(req.adsAccount._id, campaignsNotInExistsInDB);

		BlockingCriterionsModel.insertMany(campaignsArr, async err => {
			if (err) {
				logger.error('AccountAdsController::addCampaignsForAAccountAds::error', err, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ["Thêm chiến dịch không thành công"]
				});
			}

			if(campaignIdsAfterRemoveIdenticalElement.length > 0)
			{
				await AccountAdsService.backUpIpOnGoogleAds(req.adsAccount, campaignIdsAfterRemoveIdenticalElement);
			}

			logger.info('AccountAdsController::addCampaignsForAAccountAds::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ["Thêm chiến dịch thành công"]
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::addCampaignsForAAccountAds::error', e, '\n', info);
		return next(e);
	}
};

const getListOriginalCampaigns = async (req, res, next) => {
	logger.info('AccountAdsController::getListOriginalCampaigns is called');
	try {
		const result = await AccountAdsService.retry(req, AdAccountConstant.retryCount, AccountAdsService.getListOriginalCampaigns);

		logger.info('AccountAdsController::connectionConfirmation::success\n');
		return res.status(result.status).json(result);
	} catch (e) {
		logger.error('AccountAdsController::getOriginalCampaigns::error', e);
		return next(e);
	}
};

const connectionConfirmation = async (req, res, next) => {
	const info = {
		adsId: req.body.adWordId,
		_id  : req.user._id
	}
	logger.info('AccountAdsController::connectionConfirmation is called\n', info);
	try {
		const { error } = Joi.validate(req.body, AddAccountAdsValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { adWordId } = req.body;
		let user = req.user._id;

		const account = await AccountAdsModel.findOne({ adsId: adWordId, user, isDeleted: false });

		if (!account) {
			logger.info('AccountAdsController::connectionConfirmation::accountAdsNotFound\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Không tìm thấy tài khoản adswords.'],
			});
		}

		GoogleAdwordsService.sendManagerRequest(adWordId)
			.then(result => {
				account.isConnected = false;

				account.save(err => {
					if (err) {
						logger.error('AccountAdsController::connectionConfirmation::error', err, '\n', info);
						return next(err);
					}
					logger.info('AccountAdsController::connectionConfirmation::success\n', info);
					return res.status(HttpStatus.OK).json({
						messages: ['Đã gửi request đến tài khoản Google Ads của bạn, vui lòng truy cập và chấp nhập'],
						data    : {
							isConnected: false
						}
					});
				});
			}).catch(err => {
			const message = GoogleAdwordsService.mapManageCustomerErrorMessage(err);
			let isConnected = false;
			switch (message) {
				case ManagerCustomerMsgs.ALREADY_MANAGED_BY_THIS_MANAGER:
					isConnected = true;
					break;
				case ManagerCustomerMsgs.ALREADY_INVITED_BY_THIS_MANAGER:
					break;
				default:
					return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
						messages: [message]
					});
			}

			account.isConnected = isConnected;

			account.save(err => {
				if (err) {
					logger.error('AccountAdsController::connectionConfirmation::error', err, '\n', info);
					return next(err);
				}
				logger.info('AccountAdsController::connectionConfirmation::success\n', info);
				return res.status(HttpStatus.OK).json({
					messages: [message],
					data    : {
						isConnected
					}
				});
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::connectionConfirmation::error', e, '\n', info);
		return next(e);
	}
};

const getReportOnDevice = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::getReportOnDevice::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::getReportOnDevice is called\n', info);
	try {
		const query = {
			accountId: req.adsAccount._id,
			isDeleted: false
		};
		const campaigns = await BlockingCriterionsModel.find(query)

		if (campaigns.length === 0) {
			logger.info('AccountAdsController::getReportOnDevice::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: 'Lấy report thành công',
				data    : {
					reportDevice: []
				}
			});
		}

		const fields = ['Device', 'Cost', 'Impressions', 'Clicks', 'AveragePosition', 'CampaignId', 'CampaignDesktopBidModifier', 'CampaignMobileBidModifier', 'CampaignTabletBidModifier'];
		const campaignIds = campaigns.map(campaign => campaign.campaignId);
		const startDate = moment().subtract(1, 'months').format('MM/DD/YYYY');
		const endDate = moment().format('MM/DD/YYYY');

		GoogleAdwordsService.getReportOnDevice(req.adsAccount.adsId, campaignIds, fields, startDate, endDate)
			.then(result => {
				const jsonArr = AccountAdsService.convertCSVToJSON(result);

				if (jsonArr.length === 0) {
					logger.info('AccountAdsController::getReportOnDevice::success\n', info);
					return res.status(HttpStatus.OK).json({
						messages: 'Lấy report thành công',
						data    : {
							reportDevice: []
						}
					});
				}

				const reportDevice = AccountAdsService.reportTotalOnDevice(jsonArr);
				logger.info('AccountAdsController::getReportOnDevice::success\n', info);
				return res.status(HttpStatus.OK).json({
					messages: 'Lấy report thành công',
					data    : {
						reportDevice
					}
				});
			}).catch(err => {
			logger.error('AccountAdsController::getReportOnDevice::error', err, '\n', info);
			next(err);
		});
	} catch (e) {
		logger.error('AccountAdsController::getReportOnDevice::error ', e, '\n', info);
		next(e);
	}
};

const setUpCampaignsByOneDevice = async (req, res, next) => {
	const info = {
		userId   : req.adsAccount.user,
		adsId    : req.adsAccount.adsId,
		device   : req.body.device,
		isEnabled: req.body.isEnabled
	};

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::setUpCampaignsByOneDevice::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::setUpCampaignsByOneDevice is called\n', info);

	try {
		const { error } = Joi.validate(req.body, setUpCampaignsByOneDeviceValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { device, isEnabled } = req.body;
		const query = {
			accountId: req.adsAccount._id,
			isDeleted: false
		}
		const campaigns = await BlockingCriterionsModel.find(query);

		if (campaigns.length === 0) {
			logger.info('AccountAdsController::setUpCampaignsByOneDevice::accountNotCampaign\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Tài khoản chưa có chiến dịch để thiết lập.']
			});
		}

		const campaignIds = campaigns.map(campaign => campaign.campaignId);
		const adsId = req.adsAccount.adsId;
		let bidModify = isEnabled ? 1 : 0;

		Async.eachSeries(campaignIds, (campaignId, callback) => {
			GoogleAdwordsService.enabledOrPauseTheCampaignByDevice(adsId, campaignId, device, bidModify)
				.then(result => {
					callback();
				}).catch(error => {
				logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', error, '\n', info);
				callback(error);
			});
		}, async err => {
			if (err) {
				logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', err, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ['Thiết lập không thành công.']
				});
			}

			await AccountAdsService.saveSetUpCampaignsByOneDevice(req.adsAccount, device, isEnabled);


			const actionMessage = isEnabled ? "Chạy" : "Dừng chạy";
			let deviceMessage = '';

			for (let [key, value] of Object.entries(CriterionIdOfDevice)) {
				if (device === value) {
					deviceMessage = key;
				}
			}

			// log action history
			const actionHistory = {
				userId : req.user._id,
				content: `${actionMessage} chiến dịch theo thiết bị: ${deviceMessage}`,
				param  : { device, isEnabled }
			};

			await userActionHistoryService.createUserActionHistory(actionHistory);

			logger.info('AccountAdsController::setUpCampaignsByOneDevice::success\n', info);
			return res.status(HttpStatus.OK).json({
				messages: ['Thiết lập thành công.']
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::setUpCampaignsByOneDevice::error', e, '\n', info);
		next(e);
	}
};

const blockSampleIp = (req, res, next) => {
	const info = {
		userId: req.adsAccount.user,
		adsId : req.adsAccount.adsId,
		ip    : req.body.ip
	};

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::blockSampleIp::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::blockSampleIp\n', info);
	try {
		const { error } = Joi.validate(req.body, sampleBlockingIpValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { ip } = req.body;
		const campaignIds = req.campaignIds || [];
		const adsId = req.adsAccount.adsId;
		const accountId = req.adsAccount._id;
		let allIpInBlackList = req.adsAccount.setting.customBlackList;
		const ipInwhiteList = req.adsAccount.setting.customWhiteList || [];
		allIpInBlackList = allIpInBlackList.concat(req.adsAccount.setting.autoBlackListIp);
		const checkIpInDB = allIpInBlackList.filter(ele => ele === ip);
		const ipsInBlackListNumber = allIpInBlackList.length;
		const maxIpsNumber = req.adsAccount.setting.maxIps || AdAccountConstant.setting.maxIps;

		if(ipsInBlackListNumber >= ( maxIpsNumber - AdAccountConstant.ipsNumberForAutoBlackList))
		{
			logger.info('AccountAdsController::blockSampleIp::Ips number in DB greater than ips default number ');
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Số lượng ip đã vượt quá số lượng ip cho phép! Vui lòng xóa ip để tiếp tục sử dụng chức năng này.']
			}) 
		}

		if (checkIpInDB.length !== 0) {
			logger.info('AccountAdsController::blockSampleIp::blockSampleIp::Conflict\n', info);
			return res.status(HttpStatus.CONFLICT).json({
				messages: ['ip đã có trong blacklist.'],
				data    : {
					ips: checkIpInDB
				}
			});
		}

		const checkIpInCustomWhiteList = checkIpsInWhiteList([ip], ipInwhiteList);

		if (!checkIpInCustomWhiteList.status) {
			logger.info('AccountAdsController::blockSampleIp::' + ActionConstant.ADD + '::IpExistsInCustomWhiteList\n', info);
			return res.status(HttpStatus.CONFLICT).json({
				messages: ['Ip đang nằm trong whiteList.'],
				data    : {
					ips: checkIpInCustomWhiteList.ipsConflict
				}
			});
		}

		Async.series([
			(cb) => {
				if (req.adsAccount.setting.sampleBlockingIp || req.adsAccount.setting.sampleBlockingIp !== '') {
					AccountAdsService.removeSampleBlockingIp(adsId, accountId, campaignIds)
						.then(result => {
							logger.info('AccountAdsController::blockSampleIp::removeSampleBlockingIp::success', info);
							cb(null);
						}).catch(err => {
						cb(err);
					});
				} else {
					cb();
				}
			}
		], (err) => {
			if (err) {
				logger.error('AccountAdsController::blockSampleIp::removeSampleBlockingIp::error', err, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ['Thêm ip không thành công.']
				});
			}
			AccountAdsService.addSampleBlockingIp(adsId, accountId, campaignIds, ip)
				.then(result => {
					req.adsAccount.setting.sampleBlockingIp = ip;
					req.adsAccount.save(async error => {
						if (error) {
							logger.error('AccountAdsController::blockSampleIp::error', error, '\n', info);
							return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
								messages: ['Thêm ip không thành công.']
							});
						}

						// log action history
						const actionHistory = {
							userId : req.user._id,
							content: "Chặn thử 1 ip: " + info.ip,
							param  : { ip }
						};

						await userActionHistoryService.createUserActionHistory(actionHistory);

						logger.info('AccountAdsController::blockSampleIp::addSampleBlockingIp::success', info);
						return res.status(HttpStatus.OK).json({
							messages: ['Thêm ip thành công.']
						});
					});
				}).catch(err => {
				logger.error('AccountAdsController::blockSampleIp::addSampleBlockingIp::error', err, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ['Thêm ip không thành công.']
				});
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::blockSampleIp::error', e, '\n', info);
		next(e);
	}
};

const unblockSampleIp = (req, res, next) => {
	const info = {
		userId: req.adsAccount.user,
		adsId : req.adsAccount.adsId,
		ip    : req.body.ip
	};

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::unblockSampleIp::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::unblockSampleIp is called\n', info);
	try {
		const { error } = Joi.validate(req.body, sampleBlockingIpValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { ip } = req.body;

		if (req.adsAccount.setting.sampleBlockingIp !== ip || !req.adsAccount.setting.sampleBlockingIp) {
			logger.info('AccountAdsController::unblockSampleIp::notFound\n', info);
			return res.status(HttpStatus.NOT_FOUND).json({
				messages: ['Ip không nằm trong blackList.'],
				data    : {
					ips: [ip]
				}
			});
		}

		const campaignIds = req.campaignIds || [];
		const adsId = req.adsAccount.adsId;
		const accountId = req.adsAccount._id;

		AccountAdsService.removeSampleBlockingIp(adsId, accountId, campaignIds)
			.then(result => {
				req.adsAccount.setting.sampleBlockingIp = '';
				req.adsAccount.save(async error => {
					if (error) {
						logger.error('AccountAdsController::unblockSampleIp::error', error, '\n', info);
						return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
							messages: ['Xóa ip không thành công.']
						});
					}

					// log action history
					const actionHistory = {
						userId : req.user._id,
						content: " Xóa ip ra khỏi danh sách chặn thử: " + info.ip,
						param  : { ip: info.ip }
					};

					await userActionHistoryService.createUserActionHistory(actionHistory);
					logger.info('AccountAdsController::unblockSampleIp::success\n', info);
					return res.status(HttpStatus.OK).json({
						messages: ['Xóa ip thành công.']
					});
				});
			}).catch(err => {
			logger.error('AccountAdsController::unblockSampleIp::error', err, '\n', info);
			next(err);
		});
	} catch (e) {
		logger.error('AccountAdsController::unblockSampleIp::error', e, '\n', info);
		next(e);
	}
};

const getIpInSampleBlockIp = (req, res, next) => {
	const info = {
		userId: req.adsAccount.user,
		adsId : req.adsAccount.adsId,
	};

	logger.info('AccountAdsController::getIpInSampleBlockIp is called\n', info);
	const ip = req.adsAccount.setting.sampleBlockingIp;
	let ips = [];

	if (ip) {
		ips.push(ip);
	}

	logger.info('AccountAdsController::getIpInSampleBlockIp::success\n', info);
	return res.status(HttpStatus.OK).json({
		messages: ['Lấy ip thành công.'],
		data    : {
			ips
		}
	});
};

const getIpsInCustomBlackList = async (req, res, next) => {
	const info = {
		userId: req.adsAccount.user,
		adsId : req.adsAccount.adsId,
	};

	try {
		logger.info('AccountAdsController::getIpsInCustomBlackList is called\n', info);
		const accountId = req.adsAccount._id;

		const ips = await AccountAdsService.getIpAndCampaigNumberInCustomBlockingIp(accountId);

		logger.info('AccountAdsController::getIpsInCustomBlackList::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy ip thành công.'],
			data    : {
				ips
			}
		});
	} catch (e) {
		logger.error('AccountAdsController::getIpsInCustomBlackList::error', e, '\n', info);
		next(e);
	}
};

const getCampaignsInDB = (req, res, next) => {
	const info = {
		_id  : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}

	if (!req.adsAccount.isConnected) {
		logger.info('AccountAdsController::getCampaignsInDB::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('AccountAdsController::getCampaignsInDB is called\n', info);

	try {
		const accountId = req.adsAccount._id;
		const query = {
			accountId,
			isDeleted: false
		};
		BlockingCriterionsModel.find(query)
			.exec((err, campaigns) => {
				if (err) {
					logger.error('AccountAdsController::getCampaignsInDB::error', err, '\n', info);
					return next(err);
				}

				let campaignIds = [];

				if (campaigns.length !== 0) {
					campaignIds = campaigns.map(campaign => campaign.campaignId);
				}

				logger.info('AccountAdsController::getCampaignsInDB::success\n', info);
				return res.status(HttpStatus.OK).json({
					messages: ['Lấy chiến dịch thành công.'],
					data    : {
						campaignIds
					}
				});
			});
	} catch (e) {
		logger.error('AccountAdsController::getCampaignsInDB::error', e, '\n', info);
		next(e);
	}
};

const verifyAcctachedCodeDomains = async (req, res, next) => {
	logger.info('AccountAdsController::verifyAcctachedCodeDomains is called, userId:', req.user._id, '::accountId:', req.params.account_id);
	try {
		const { error } = Joi.validate(req.params, VerifyAcctachedCodeDomainsValidationSchema);
		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { accountId } = req.params;

		const adsAccount = await AccountAdsModel.findOne({ _id: accountId });
		if (!adsAccount) {
			const result = {
				messages: [messages.ResponseMessages.AccountAds.ACCOUNT_NOT_FOUND],
			};

			logger.info('AccountAdsController::verifyAcctachedCodeDomains::AccountAdsNotFound::userId:', req.user._id, '::accountId:', req.params.accountId);
			return res.status(HttpStatus.NOT_FOUND).json(result);
		}

		let websites = await WebsiteModel.find({
			accountAd: accountId
		});
		websites = await AccountAdsService.checkDomainHasTracking(websites, adsAccount.key);
		const result = {
			messages: [messages.ResponseMessages.SUCCESS],
			data    : {
				websites
			}
		};

		logger.info('AccountAdsController::verifyAcctachedCodeDomains::success::userId:', req.user._id, '::accountId:', req.params.accountId);
		return res.status(HttpStatus.OK).json(result);

	} catch (e) {
		logger.error('AccountAdsController::verifyAcctachedCodeDomains::error', e);
		return next(e);
	}
};

const getReportForAccount = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	};
	logger.info('AccountAdsController::getReportForAccount::is called\n', info);
	try {

		const { error } = Joi.validate(req.query, getReportForAccountValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { from, to } = req.query;
		let { page, limit } = req.query;
		const { isConnected } = req.adsAccount;

		if (!page || !isConnected) {
			page = Paging.PAGE;
		}

		if (!limit || !isConnected) {
			limit = Paging.LIMIT;
		}

		page = Number(page);
		limit = Number(limit);

		from = moment(from, 'DD-MM-YYYY');
		to = moment(to, 'DD-MM-YYYY');

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::getReportForAccount::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		const endDateTime = moment(to).endOf('day');
		const accountKey = req.adsAccount.key;

		let result = await AccountAdsService.getReportForAccount(accountKey, from, endDateTime, page, limit);
		let logs = [];
		let totalItems = 0;

		if (result[0].entries.length !== 0) {
			logs = result[0].entries;
			totalItems = !isConnected ? logs.length : result[0].meta[0].totalItems
			const gclidList = logs.map(log => log.gclid).filter(AccountAdsService.onlyUnique);
			const clickReport = await ClickReportService.getReportByGclId(gclidList);
			logs = ClickReportService.mapCLickReportIntoUserLogs(clickReport, logs);
		}

		const clickInDaysOfAccountKey = await AccountAdsService.getNoClickOfIps(accountKey, from._d, endDateTime._d);
		logs.forEach((item, index) => {
			logs[index].click = clickInDaysOfAccountKey[item.ip] || 0;
		});

		logger.info('AccountAdsController::getReportForAccount::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ["Lấy report thành công"],
			data    : {
				logs,
				totalItems
			}
		});
	} catch (e) {
		logger.error('AccountAdsController::getReportForAccount::error', e, '\n', info);
		next(e);
	}
};

const getSettingOfAccountAds = (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}

	logger.info('AccountAdsController::getSettingOfAccountAds::is called\n', info);
	const setting = req.adsAccount.setting;

	logger.info('AccountAdsController::getIpsInCustomBlackList::success\n', info);
	return res.status(HttpStatus.OK).json({
		messages: ['Lấy thiết lập trong tài khoản thành công.'],
		data    : {
			setting
		}
	});
};

const getDailyClicking = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}
	logger.info('AccountAdsController::getDailyClicking::is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getDailyClickingValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const accountKey = req.adsAccount.key;
		const maxClick = req.adsAccount.setting.autoBlockByMaxClick;
		let { page, limit } = req.query;
		const { isConnected } = req.adsAccount;

		if (!page || !isConnected) {
			page = Paging.PAGE;
		}

		if (!limit || !isConnected) {
			limit = Paging.LIMIT;
		}

		page = Number(page);
		limit = Number(limit);

		const result = await AccountAdsService.getDailyClicking(accountKey, maxClick, page, limit);
		let entries = [];
		let totalItems = 0;

		if (result[0].entries.length !== 0) {
			entries = result[0].entries;
			totalItems = !isConnected ? entries.length : result[0].meta[0].totalItems;
		}

		// get number click in a day
		const now = moment().startOf('day')._d;
		const tomorrow = moment(now).endOf('day')._d;
		const clickInDaysOfAccountKey = await AccountAdsService.getNoClickOfIps(accountKey, now, tomorrow);
		entries.forEach((item, index) => {
			entries[index].click = clickInDaysOfAccountKey[item._id];
		});

		logger.info('AccountAdsController::getDailyClicking::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data    : {
				entries,
				totalItems
			}
		});
	} catch (e) {
		logger.error('AccountAdsController::getDailyClicking::error', e, '\n', info);
		next(e);
	}
};

const getDetailAccountAdword = async (req, res) => {
	try {
		const { accountId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(accountId)) {
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ["Wrong account id"],
				data    : null
			});
		}

		let adsAccount = await AccountAdsModel.findOne({ _id: accountId, user: req.user._id });
		if (!adsAccount) {
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Account not found'],
				data    : null
			})
		}

		const query = {
			accountId,
			isDeleted: false
		};

		const campaignNumber = await BlockingCriterionsModel.countDocuments(query);

		return res.status(HttpStatus.OK).json({
			messages: ['Get account successfully'],
			data    : {
				adsAccount,
				campaignNumber
			}
		});
	} catch (e) {
		logger.error('AccountAdsController::getDetailAccountAdword::error', e);
		return next(e);
	}
};

const getIpsInfoInClassD = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}
	logger.info('AccountAdsController::getIpsInfoInClassD::is called\n', info);
	try {

		const { error } = Joi.validate(req.query, getIpsInfoInClassDValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { from, to } = req.query;
		let { page, limit } = req.query;
		const { isConnected } = req.adsAccount;

		if (!page || !isConnected) {
			page = Paging.PAGE;
		}

		if (!limit || !isConnected) {
			limit = Paging.LIMIT;
		}

		page = Number(page);
		limit = Number(limit);

		from = moment(from, 'DD-MM-YYYY');
		to = moment(to, 'DD-MM-YYYY');

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::getIpsInfoInClassD::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		const endDateTime = moment(to).endOf('day');
		const accountKey = req.adsAccount.key;

		const result = await AccountAdsService.getIpsInfoInClassD(accountKey, from, endDateTime, page, limit);
		let rangeIps = [];
		let totalItems = 0;

		if (result[0].entries.length !== 0) {
			rangeIps = result[0].entries;
			totalItems = !isConnected ? rangeIps.length : result[0].meta[0].totalItems
		}

		logger.info('AccountAdsController::getIpsInfoInClassD::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data    : {
				rangeIps,
				totalItems
			}
		});

	} catch (e) {
		logger.error('AccountAdsController::getIpsInfoInClassD::error', e, '\n', info);
		next(e);
	}
};

const removeAccountAds = async (req, res, next) => {
	logger.info('AccountAdsController::removeAccountAds::is called', { accountAdId: req.adsAccount._id.toString() });
	try {
		req.adsAccount.isDeleted = true;
		await req.adsAccount.save();
		logger.info('AccountAdsController::removeAccountAds::success. Account ad _id', req.adsAccount._id.toString());
		return res.status(200).json({
			messages: ['Xóa tài khoản ads thành công']
		})
	} catch (e) {
		logger.error('AccountAdsController::removeAccountAds::error', e);
		return next(e);
	}
};

const removeIpInAutoBlackListIp = (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		asdId: req.adsAccount.adsId,
		ips  : req.body.ips
	};

	logger.info('AccountAdsController::removeAccountAds::is called\n', info);
	try {
		const { error } = Joi.validate(req.body, removeIpInAutoBlackListValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { ips } = req.body;
		const autoBlackListIp = req.adsAccount.setting.autoBlackListIp || [];
		const ipArrAfterRemoveIdenticalElement = ips.filter(AccountAdsService.onlyUnique);
		const campaignIds = req.campaignIds || [];
		const id = req.adsAccount._id;
		const adsId = req.adsAccount.adsId;

		const checkIpsInBlackList = AccountAdsService.checkIpIsNotOnTheBlackList(autoBlackListIp, ipArrAfterRemoveIdenticalElement);

		if (checkIpsInBlackList.length !== 0) {
			logger.info('AccountAdsController::removeAccountAds::notFound\n', info);
			return res.status(HttpStatus.NOT_FOUND).json({
				messages: ['Ip không nằm trong blacklist.'],
				data    : {
					ips: checkIpsInBlackList
				}
			});
		}

		Async.eachSeries(campaignIds, (campaignId, callback) => {
			AccountAdsService.removeIpsToAutoBlackListOfOneCampaign(id, adsId, campaignId, ipArrAfterRemoveIdenticalElement, callback);
		}, err => {
			if (err) {
				logger.error('AccountAdsController::handleManipulationGoogleAds::error', err, '\n', info);
				return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
					messages: ['Xóa ip không thành công.']
				});
			}

			const ipNotExistsInListArr = _.difference(autoBlackListIp, ipArrAfterRemoveIdenticalElement);

			req.adsAccount.setting.autoBlackListIp = ipNotExistsInListArr;
			req.adsAccount.save(async err => {
				if (err) {
					logger.error('AccountAdsController::removeIpInAutoBlackListIp::error', err, '\n', info);
					return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
						messages: ['Xóa ip không thành công.']
					});
				}

				// log action history
				const actionHistory = {
					userId : req.user._id,
					content: " Xóa ip ra khỏi danh sách ip đã chặn: " + info.ips.join(', '),
					param  : { ips: info.ips }
				};

				await userActionHistoryService.createUserActionHistory(actionHistory);
				logger.info('AccountAdsController::removeIpInAutoBlackListIp::success\n', info);
				return res.status(HttpStatus.OK).json({
					messages: ['Xóa ip thành công.']
				});
			});
		});
	} catch (e) {
		logger.error('AccountAdsController::removeIpInAutoBlackListIp::error', e);
		return next(e);
	}
};

const getIpHistory = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		asdId: req.adsAccount.adsId,
		ip   : req.query.ip
	};

	logger.info('AccountAdsController::getIpHistory::is called\n', info);
	try {
		const { error } = Joi.validate(req.query, getIpHistoryValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { ip } = req.query;
		let { page, limit } = req.query;
		const { isConnected } = req.adsAccount;

		if (!page || !isConnected) {
			page = Paging.PAGE;
		}

		if (!limit || !isConnected) {
			limit = Paging.LIMIT;
		}

		page = Number(page);
		limit = Number(limit);

		const ipsHistory = await AccountAdsService.getIpHistory(ip, limit, page);

		let history = [];
		let totalItems = 0;
		let last = [];

		if (ipsHistory.ipHistoryResult[0].entries.length !== 0) {
			history = ipsHistory.ipHistoryResult[0].entries;
			totalItems = !isConnected ? history.length : ipsHistory.ipHistoryResult[0].meta[0].totalItems;
			last = ipsHistory.theLastIpHistory;
		}

		logger.info('AccountAdsController::getIpHistory::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ['Lấy dữ liệu thành công.'],
			data    : {
				history,
				totalItems,
				last
			}
		});

	} catch (e) {
		logger.error('AccountAdsController::getIpHistory::error', e);
		return next(e);
	}
};

const statisticUser = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	};

	if (!req.adsAccount.isConnected) {
		logger.info('UserBehaviorLogController::statisticUser::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('UserBehaviorLogController::statisticUser is called\n', info);
	try {
		const { error } = Joi.validate(req.query, CheckDate);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { limit, page, startDate, endDate } = req.query;

		startDate = startDate ? moment(startDate, 'DD-MM-YYYY') : null;
		endDate = endDate ? moment(endDate, 'DD-MM-YYYY') : null;
		startDate = !startDate ? moment().add(-7, 'd').startOf('day') : moment(startDate).startOf('day');
		endDate = !endDate ? moment().endOf('day') : moment(endDate).endOf('day');
		const twoWeek = moment(startDate).add(14, 'd').endOf('day');

		if (endDate.isBefore(startDate)) {
			logger.info('UserBehaviorLogController::statisticUser::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		if(twoWeek.isBefore(endDate))
		{
			logger.info('UserBehaviorLogController::statisticUser::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Khoảng cách giữa ngày bắt đầu và ngày kết thúc tối đa là 2 tuần.']
			});
		}

		const stages = UserBehaviorLogService.buildStageStatisticUser({
			accountKey: req.adsAccount.key ? req.adsAccount.key : null,
			limit     : parseInt((limit || 10).toString()),
			page      : parseInt((page || 1).toString()),
			startDate,
			endDate
		});

		logger.info('UserBehaviorLogController::query', JSON.stringify(stages));

		const result = await UserBehaviorLogModel.aggregate(stages);
		const entries = result[0].entries.map(user => {
			if (user._id) {
				user._id = '*' + user._id.slice(-12) + '*';
			}

			return user;
		});

		const response = {
			status  : HttpStatus.OK,
			messages: [messages.ResponseMessages.SUCCESS],
			data    : {
				meta : {
					limit     : limit || 10,
					page      : page || 1,
					totalItems: result[0].meta[0] ? result[0].meta[0].totalItems : 0
				},
				users: entries
			}
		};

		return res.status(HttpStatus.OK).json(response);

	} catch (e) {
		logger.error('UserController::statisticUser::error', e);
		return next(e);
	}
};

const detailUser = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	};

	if (!req.adsAccount.isConnected) {
		logger.info('UserBehaviorLogController::detailUser::accountAdsNotConnected\n', info);
		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ['Tài khoản chưa được kết nối với Google Ads']
		});
	}

	logger.info('UserBehaviorLogController::detailUser is called\n', info);
	try {
		const { error } = Joi.validate(req.query, CheckDate);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { limit, page, startDate, endDate } = req.query;

		const { id } = req.params;

		const stages = UserBehaviorLogService.buildStageDetailUser({
			uuid : id,
			limit: parseInt((limit || 10).toString()),
			page : parseInt((page || 1).toString()),
			startDate,
			endDate
		});

		const result = await UserBehaviorLogModel.aggregate(stages);


		// get last log
		const lastLog = await UserBehaviorLogModel.findOne({
			uuid : id,
		}).sort({
			createdAt: -1
		});

		const response = {
			status  : HttpStatus.OK,
			messages: [messages.ResponseMessages.SUCCESS],
			data    : {
				meta: {
					limit     : limit || 10,
					page      : page || 1,
					totalItems: result[0].meta[0] ? result[0].meta[0].totalItems : 0
				},
				logs: result[0].entries,
				last: lastLog
			}
		};

		return res.status(HttpStatus.OK).json(response);

	} catch (e) {
		logger.error('UserController::detailUser::error', e);
		return next(e);
	}
};


const getReportStatistic = async (req, res, next) => {
	const info = {
		id   : req.adsAccount._id,
		adsId: req.adsAccount.adsId
	}
	logger.info('AccountAdsController::getReportStatistic::is called\n', info);
	try {

		const { error } = Joi.validate(req.query, getReportStatisticValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		let { from, to } = req.query;

		from = moment(from, 'DD-MM-YYYY');
		to = moment(to, 'DD-MM-YYYY');

		if (to.isBefore(from)) {
			logger.info('AccountAdsController::getReportStatistic::babRequest\n', info);
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ['Ngày bắt đầu đang nhỏ hơn ngày kết thúc.']
			});
		}

		const endDateTime = moment(to).endOf('day');
		const accountKey = req.adsAccount.key;

		let result = await AccountAdsService.getReportStatistic(accountKey, from, endDateTime)
		const totalSpamClick = result.reduce((total, ele) => total + ele.spamClick, 0);
		const totalRealClick = result.reduce((total, ele) => total + ele.realClick, 0);

		logger.info('AccountAdsController::getReportStatistic::success\n', info);
		return res.status(HttpStatus.OK).json({
			messages: ["Lấy report thành công"],
			data    : {
				pieChart : {
					spamClick: totalSpamClick,
					realClick: totalRealClick
				},
				lineChart: result
			}
		});
	} catch (e) {
		logger.error('AccountAdsController::getReportStatistic::error', e, '\n', info);
		next(e);
	}
};

const getListGoogleAdsOfUser = async (req, res, next) => {
	logger.info('AccountAdsController::getListGoogleAdsOfUser is called. Get list google ads of google id', req.user.googleId);
	try {
		const { error } = Joi.validate(req.query, getListGoogleAdsOfUserValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		const { accessToken, refreshToken } = req.query;

		if (!req.user.googleId) {
			return next(new Error('Chỉ dành cho tài khoản đăng nhập bằng google'));
		}

		req.accessToken  = accessToken;
		req.refreshToken = refreshToken;

		const retry = await AccountAdsService.retry(req, AdAccountConstant.retryCount, AccountAdsService.getListGoogleAdsOfUser);

		return res.json(retry);
	} catch (e) {
		logger.error('AccountAdsController::getListGoogleAdsOfUser::error', e);
		return next(e);
	}
};

const ConnectGoogleAdsByEmail = async(req, res, next) => {
	const info = {
		id   : req.user._id,
		adsId: req.user.adsId
	}
	logger.info('AccountAdsController::ConnectGoogleAdsByEmail::is called\n', info);
	try{
		const { error } = Joi.validate(req.body, connectGoogleAdsByEmailValidationSchema);

		if (error) {
			return requestUtil.joiValidationResponse(error, res);
		}

		if(req.user.googleRefreshToken == '' || !req.user.googleRefreshToken)
		{
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ["Thao tác không hợp lệ"],
			});
		}

		const { adWordId } = req.body;
		const adWord = await AccountAdsModel.findOne({adsId: adWordId});

		if(adWord)
		{
			return res.status(HttpStatus.BAD_REQUEST).json({
				messages: ["Tài khoản đã được quản lý bởi tài khoản khác."],
			});
		}

		const userId      = req.user._id;
		const connectType = AdAccountConstant.connectType.byEmail; 
		const isConnected = true;

		await AccountAdsService.createAccountAdsHaveIsConnectedStatusAndConnectType({userId, adWordId, isConnected, connectType})

		return res.status(HttpStatus.BAD_REQUEST).json({
			messages: ["Kết nối tài khoản thành công."],
		});
	}catch(e){
		logger.error('AccountAdsController::ConnectGoogleAdsByEmail::is called\n', info);
		return next(e);
	}
};

module.exports = {
	addAccountAds,
	handleManipulationGoogleAds,
	getAccountsAds,
	getDetailAccountAdword,
	autoBlockIp,
	autoBlockingRangeIp,
	autoBlocking3g4g,
	blockByPrivateBrowser,
	addCampaignsForAAccountAds,
	getListOriginalCampaigns,
	connectionConfirmation,
	getReportOnDevice,
	setUpCampaignsByOneDevice,
	blockSampleIp,
	unblockSampleIp,
	getIpInSampleBlockIp,
	getIpsInCustomBlackList,
	verifyAcctachedCodeDomains,
	getReportForAccount,
	getCampaignsInDB,
	getSettingOfAccountAds,
	getDailyClicking,
	getIpsInfoInClassD,
	removeAccountAds,
	removeIpInAutoBlackListIp,
	getIpHistory,
	updateWhiteList,
	statisticUser,
	getReportStatistic,
	detailUser,
	getListGoogleAdsOfUser,
	ConnectGoogleAdsByEmail
};

