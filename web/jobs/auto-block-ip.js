const UserBehaviorLogsModel = require('../modules/user-behavior-log/user-behavior-log.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const GoogleAdsService = require('../services/GoogleAds.service');
const RabbitMQService = require('../services/rabbitmq.service');
const Async = require('async');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const moment = require('moment');
const { LOGGING_TYPES } = require('../modules/user-behavior-log/user-behavior-log.constant');
const NetworkCompanyName = require('../constants/networkCompanyName.contant');
const { checkIpsInWhiteList } = require('../services/check-ip-in-white-list.service');
const AccountAdsConstant = require('../modules/account-adwords/account-ads.constant');
const AccountAdsService = require('../modules/account-adwords/account-ads.service');
const { MESSAGE } = require('../modules/user-behavior-log/user-behavior-log.constant');

const saveIpIntoAutoBlackListIp = async (key, id, ip, message) => {
    logger.info('jobs::saveIpIntoAutoBlackListIp::is called', { key, id, ip });
    try {
        const updateData = { $push: { "setting.autoBlackListIp": ip } };
        await AccountAdsModel.updateOne({ key }, updateData);
        await updateIsSpamStatus(id, message);
        return;
    } catch (e) {
        logger.error('jobs::saveIpIntoAutoBlackListIp::error', err, { id });
        return;
    }
};

const updateIsSpamStatus = async (id, message) => {
    logger.info('jobs::updateIsSpamStatus::is called', { id });
    try {
        const queryUpdate = { _id: id };
        const dataUpdate = { $set: { isSpam: true, reason: { message } } };

        const query = JSON.stringify({ queryUpdate, dataUpdate });

        logger.info(`jobs::updateIspamStatus::udpate query ${query}`);
        await UserBehaviorLogsModel.updateOne(queryUpdate, dataUpdate);
        return;
    } catch (e) {
        logger.error('jobs::updateIspamStatus::error', e, { id });
        return;
    }
};

const checkNetWorkCompany = (log, accountAds) => {
    const networkCompany = log.networkCompany.name;
    const settingOfViettel = accountAds.setting.mobileNetworks.viettel;
    const settingOfMobifone = accountAds.setting.mobileNetworks.mobifone;
    const settingOfVNPT = accountAds.setting.mobileNetworks.vinafone;
    const settingOfVietnamobile = accountAds.setting.mobileNetworks.vietnammobile;
    const settingOfFpt = accountAds.setting.mobileNetworks.fpt;

    if (networkCompany === NetworkCompanyName.VIETTEL && settingOfViettel ||
        networkCompany === NetworkCompanyName.MOBIFONE && settingOfMobifone ||
        networkCompany === NetworkCompanyName.VNPT && settingOfVNPT ||
        networkCompany === NetworkCompanyName.VIETNAMOBILE && settingOfVietnamobile ||
        networkCompany === NetworkCompanyName.FPT && settingOfFpt) {
        return 1;
    }
    return 0;
};

const countClickInLogs = async (ip, accountKey, countMaxClickInHours) => {
    try {
        const timeSet = moment().subtract(countMaxClickInHours, 'hour');
        const now = moment();

        const countQuery = {
            ip,
            accountKey,
            type: LOGGING_TYPES.CLICK,
            createdAt: {
                $gte: new Date(timeSet),
                $lt: new Date(now)
            }
        };

        return await UserBehaviorLogsModel.countDocuments(countQuery);
    } catch (e) {
        logger.error('jobs::countClick::error', e);
        return 0;
    }
};

const saveIpIntoDB = async (isConnected, accountAds, ip, key, id, message, log) => {
    if (isConnected) {
        const query = { accountId: accountAds._id, isDeleted: false };
        const campaignsOfAccount = await BlockingCriterionsModel.find(query);

        if (campaignsOfAccount.length === 0) {
            logger.info('jobs::autoBlockIp::accountAdsWithoutCampaign.', { id });
            log.reason = {
                message: MESSAGE.campaignNotFound
            }
            log.isSpam = true;
            await log.save();
            return;
        }

        const campaignIds = campaignsOfAccount.map(campaign => campaign.campaignId);
        const adsId = accountAds.adsId;
        const accountId = accountAds._id;

        Async.series([
            cb => {
                if(!checkIpsNumber(accountAds))
                {
                    logger.info('jobs::autoBlockIp::Ips number in DB greater than ips default number.', { id, ip });
                    const ipFirst = [accountAds.setting.autoBlackListIp[0]];
                    return removeIps(accountAds, campaignIds, ipFirst, cb);      
                }
                else
                {
                    return cb();
                }
            }
        ], async err => {
            if(err)
            {
                logger.error('jobs::autoBlockIp::error', err, '\n', { id });
                log.reason = {
                    message: MESSAGE.errorGoogle,
                    error: JSON.stringify(err)
                }
                await log.save();
                return;
            }

            Async.eachSeries(campaignIds, (campaignId, callback) => {
                GoogleAdsService.addIpBlackList(adsId, campaignId, ip)
                    .then((result) => {
                        const accountInfo = { result, accountId, campaignId, adsId, ip };
                        return RabbitMQService.addIpAndCriterionIdInAutoBlackListIp(accountInfo, callback);
                    }).catch(err => {
                        switch (GoogleAdsService.getErrorCode(err)) {
                            case 'OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY':
                                logger.info('AccountAdsController::autoBlockIp::OPERATION_NOT_PERMITTED_FOR_REMOVED_ENTITY', {campaignId});
                                return AccountAdsService.updateIsDeletedStatusIsTrueForCampaign(accountId, campaignId, callback);
                            case 'INVALID_IP_ADDRESS':
                                logger.info('AccountAdsController::autoBlockIp::INVALID_IP_ADDRESS', {campaignId});
                                return callback();
                            default:
                                const message = GoogleAdsService.getErrorCode(err);
                                logger.error('AccountAdsController::autoBlockIp::error', message);
                                return callback();
                        }
                    });
            }, async error => {
                if (error) {
                    logger.error('jobs::autoBlockIp::error', error, { id });
                    log.reason = {
                        message: MESSAGE.errorGoogle,
                        error: JSON.stringify(error)
                    }
                    await log.save();
                    // channel.ack(msg); // TODO: improve call google api limited.
                    // channel.reject(msg, true);
                    return;
                }
    
                await saveIpIntoAutoBlackListIp(key, id, ip, message);
                logger.info('jobs::autoBlockIp::success', { id });
                return;
            });
        });
    }
    else {
        await updateIsSpamStatus(id, message);
        logger.info('jobs::autoBlockIp::success', { id });
        return;
    }
};

const checkIpsNumber = (accountAds) => {
    const ipsInBlackList = accountAds.setting.customBlackList;
    const ipsInAutoBlackList = accountAds.setting.autoBlackListIp;
    const ipInSampleBlackList = accountAds.setting.sampleBlockingIp;
    const ipSampleArr = ipInSampleBlackList === "" ? [] : [ipInSampleBlackList];
    const allIpsArr = ipsInBlackList.concat(ipsInAutoBlackList, ipSampleArr);
    const maxIps = accountAds.setting.maxIPs || AccountAdsConstant.setting.maxIps;
    const ipsNumber = allIpsArr.length;

    if(ipsNumber >= maxIps)
    {
        return false;
    }

    return true;
};

const removeIps = (accountAds, campaignIds, ip, cb) => {
    logger.info('jobs::removeIps::is called',  {accountAds, campaignIds, ip});
    Async.eachSeries(campaignIds, (campaignId, callback) => {
        AccountAdsService.removeIpsToAutoBlackListOfOneCampaign(accountAds._id, accountAds.adsId, campaignId, ip, callback);
    }, err => {
        if(err)
        {
            logger.error('jobs::removeIps::error', err);
            return cb();
        }

        const ipsInAutoBlackListAfterRemove = accountAds.setting.autoBlackListIp.splice(1);
        accountAds.setting.autoBlackListIp = ipsInAutoBlackListAfterRemove;

        accountAds.save(e => {
            if(e)
            {
                logger.error('jobs::removeIps::error', e);
                return cb();
            }

            return cb();
        })    
    })
}

module.exports = async (channel, msg) => {
    logger.info('jobs::autoBlockIp is called');
    try {
        const id = JSON.parse(msg.content.toString());
        const log = await UserBehaviorLogsModel.findOne({ _id: id });
        let message = '';

        if (!log) {
            logger.info('jobs::autoBlockIp::CannotFindLog.', { id });
            channel.ack(msg);
            return;
        }

        const isPrivateBrowsing = log.isPrivateBrowsing;
        const key = log.accountKey;
        let ip = log.ip;
        const accountAds = await AccountAdsModel.findOne({ key });

        if (!accountAds) {
            logger.info('jobs::autoBlockIp::accountAdsNotFound.', { id });
            log.reason = {
                message: MESSAGE.accountNotFound
            };
            await log.save();
            channel.ack(msg);
            return;
        }

        const ipInWhiteList = accountAds.setting.customWhiteList || [];
        const checkIpInCustomWhiteList = checkIpsInWhiteList([ip], ipInWhiteList);

        if(!checkIpInCustomWhiteList.status)
        {
            logger.info('jobs::autoBlockIp::IpExistsInCustomWhiteList.', { id, ip });
            log.reason = {
                message: MESSAGE.ipExistsInWhiteList
            };
            await log.save();
            channel.ack(msg);
            return;
        }

        let ipRangesFlag = 0;
        const ipRangesClassC = accountAds.setting.autoBlackListIpRanges.classC;
        const splitIp = ip.split('.');

        if (ipRangesClassC) {
            const sliceIp = splitIp.slice(0,2);
            ip = sliceIp.join('.') + ".0.0/16";
            ipRangesFlag = 1;
            message = MESSAGE.blockIpByGroup;
        }

        const ipRangesClassD = accountAds.setting.autoBlackListIpRanges.classD;

        if (ipRangesFlag === 0 && ipRangesClassD) {
           const sliceIp = splitIp.slice(0,3);
           ip = sliceIp.join('.') + ".0/24";
           ipRangesFlag = 1;
           message = MESSAGE.blockIpByGroup;
        }

        const blackList = {
            customBlackList: accountAds.setting.customBlackList,
            autoBlackListIp: accountAds.setting.autoBlackListIp,
            sampleBlockingIp: accountAds.setting.sampleBlockingIp
        };
        const ips = RabbitMQService.checkIpIsBlackListed(blackList, [ip]);
        const { isConnected } = accountAds;

        if (ips.length !== 0) {
            logger.info('jobs::autoBlockIp::ipExistsInBlackList.', { id });
            log.reason = {
                message: MESSAGE.ipExistsInDB
            };
            log.isSpam = true;
            await log.save();
            channel.ack(msg);
            return;
        }

        if (ipRangesFlag === 0) {
            if (!isPrivateBrowsing || !accountAds.setting.blockByPrivateBrowser) {
                let flag = 0;

                if (log.networkCompany.name) {
                    flag = checkNetWorkCompany(log, accountAds);
                }

                message = MESSAGE.blockIpByNetworkCompany;

                if (flag === 0) {
                    const countMaxClickInHours = parseInt(accountAds.setting.countMaxClickInHours || AccountAdsConstant.setting.countMaxClickInHours);
                    const countClick = await countClickInLogs(ip, key, countMaxClickInHours);
                    const maxClick = accountAds.setting.autoBlockByMaxClick;

                    if (maxClick === -1 || countClick <= maxClick) {
                        logger.info('jobs::autoBlockIp::success.', { id });
                        log.reason = {
                            message: MESSAGE.ipNumberLessThanMaxClick,
                            clickNumber: countClick,
                            countMaxClickInHours
                        }
                        await log.save();
                        channel.ack(msg);
                        return;
                    }

                    message = MESSAGE.ipNumberGreaterThanMaxClick;
                }
            }
            else
            {
                message = MESSAGE.privateBrowser;
            }
        }

        await saveIpIntoDB(isConnected, accountAds, ip, key, id, message, log);
        channel.ack(msg);  
        return;
    } catch (e) {
        logger.error('jobs::autoBlockIp::error', e);
        channel.ack(msg);
        return;
    }
};
