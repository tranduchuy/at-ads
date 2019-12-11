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
const BlockIpServices = require('../services/block-ip.service');
const BlockingCriterionsConstant = require('../modules/blocking-criterions/blocking-criterions.constant');

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

const saveIpIntoDB = async (isConnected, accountAds, ip, key, id, message, log, channel, msg) => {
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
            return channel.ack(msg);
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
                return channel.ack(msg);
            }

            BlockIpServices.blockIp(accountAds, campaignIds, [ip], BlockingCriterionsConstant.positionBlockIp.AUTO_BLACKLIST, AccountAdsConstant.positionBlockIp.AUTO_BLACKLIST)
            .then(async result => {
                await updateIsSpamStatus(id, message);
                logger.info('jobs::autoBlockIp::success', { id });
                return channel.ack(msg);
            }).catch(async e => {
                logger.error('jobs::autoBlockIp::error', e, { id });
                log.reason = {
                    message: MESSAGE.errorGoogle,
                    error: JSON.stringify(e)
                }
                await log.save();
                // channel.ack(msg); // TODO: improve call google api limited.
                // channel.reject(msg, true);
                return channel.ack(msg);
            });
        });
    }
    else {
        await updateIsSpamStatus(id, message);
        logger.info('jobs::autoBlockIp::success', { id });
        return channel.ack(msg);
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
    try{
        BlockIpServices.blockIp(accountAds, campaignIds, [ip], BlockingCriterionsConstant.positionBlockIp.AUTO_BLACKLIST, AccountAdsConstant.positionBlockIp.AUTO_BLACKLIST)
        .then(result => {
            return cb()
        }).catch(err => {
            logger.error('jobs::removeIps::Error',  err);
            return cb(err);
        });
    }catch(e){
        logger.error('jobs::removeIps::Error',  e);
        return cb(e);
    }
};

const countClickIpClassC = async (accountAds, ip) => {
    logger.info('jobs::countClickIpClassC::is called', { key: accountAds.key, ip});
    try{
      const countMaxClickClassCInMinnutes = accountAds.setting.autoBlackListIpRanges.countMaxClickClassCInMinnutes || AccountAdsConstant.setting.countMaxClickClassCInMinnutes;
      const timeSet = moment().subtract(countMaxClickClassCInMinnutes, 'minutes');
      const now = moment();
      const accountKey = accountAds.key;

      const matchStage =  {
        $match: {
          accountKey,
          type: LOGGING_TYPES.CLICK,
          createdAt: {
            $gte: new Date(timeSet),
            $lt: new Date(now)
          }
        }  
      };
  
      const projectStage ={ $project: { 
          ip1: { $split: ["$ip", "."]}}
      };
  
      const projectStage1 ={ $project: {
          ip2: {$arrayElemAt: ["$ip1",0]},
          ip3: {$arrayElemAt: ["$ip1",1]}}
      };

      const projectStage2 = { $project: { 
          ipClassC: { $concat: [ "$ip2", ".", "$ip3", ".0", ".0/16"]}}
      };

      const matchStage1 =  {
        $match: {
          "ipClassC": ip
        }  
      };

      const groupStage = { $group: { 
          _id: "$ipClassC",
          totalClick: {$sum: 1}
        }
      };

      const query = [
          matchStage,
          projectStage,
          projectStage1,
          projectStage2,
          matchStage1,
          groupStage
      ];

      logger.info('jobs::countClickIpClassC::query ', { key: accountAds.key, ip, query: JSON.stringify(query)});
      const result = await UserBehaviorLogsModel.aggregate(query);

      logger.info('jobs::countClickIpClassC::success ', {accountKey});

      return result;
    }catch(e){
        logger.error('jobs::countClickIpClassC::Error',  e);
        console.log(e);
        throw new Error(e);
    }
};

const countClickIpClassD = async (accountAds, ip) => {
    logger.info('jobs::countClickIpClassD::is called', { key: accountAds.key, ip});
    try{
        const countMaxClickClassDInMinnutes = accountAds.setting.autoBlackListIpRanges.countMaxClickClassDInMinnutes || AccountAdsConstant.setting.countMaxClickClassDInMinnutes;
        const timeSet = moment().subtract(countMaxClickClassDInMinnutes, 'minutes');
        const now = moment();
        const accountKey = accountAds.key;

        const matchStage =  {
          $match: {
            accountKey,
            type: LOGGING_TYPES.CLICK,
            createdAt: {
              $gte: new Date(timeSet),
              $lt: new Date(now)
            }
          }  
        };
    
        const projectStage ={ $project: { 
            ip1: { $split: ["$ip", "."]}}
        };
    
        const projectStage1 ={ $project: {
            ip2: {$arrayElemAt: ["$ip1",0]},
            ip3: {$arrayElemAt: ["$ip1",1]},
            ip4: {$arrayElemAt: ["$ip1",2]}}
        };

        const projectStage2 = { $project: { 
            ipClassD: { $concat: [ "$ip2", ".", "$ip3", ".", "$ip4", ".0/24"]}}
        };

        const matchStage1 =  {
          $match: {
            "ipClassD": ip
          }  
        };

        const groupStage = { $group: { 
            _id: "$ipClassD",
            totalClick: {$sum: 1}
          }
        };

        const query = [
            matchStage,
            projectStage,
            projectStage1,
            projectStage2,
            matchStage1,
            groupStage
        ];

        logger.info('jobs::countClickIpClassD::query ', { key: accountAds.key, ip, query: JSON.stringify(query)});
        const result = await UserBehaviorLogsModel.aggregate(query);

        logger.info('jobs::countClickIpClassD::success ', {accountKey});

        return result;
    }catch(e){
        logger.error('jobs::countClickIpClassD::Error',  e);
        console.log(e);
        throw new Error(e);
    }
};

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

        const sampleBlockingIp = accountAds.setting.sampleBlockingIp;
        let blackList1 = accountAds.setting.customBlackList.concat(accountAds.setting.autoBlackListIp);
        blackList1 = sampleBlockingIp && sampleBlockingIp != '' ? blackList1.concat([sampleBlockingIp]) : blackList1;
        const checkIpBlackList = checkIpsInWhiteList([ip], blackList1);

        if(checkIpBlackList.ipsConflict.length > 0)
        {
            logger.info('jobs::autoBlockIp::ipExistsInBlackList.', { id });
            log.reason = {
                message: MESSAGE.ipExistsInDB
            };
            log.isSpam = true;
            await log.save();
            channel.ack(msg);
            return;
        }

        let ipRangesFlag = 0;
        const ipRangesClassC = accountAds.setting.autoBlackListIpRanges.classC;
        const splitIp = ip.split('.');

        if (ipRangesClassC) {
          const sliceIp = splitIp.slice(0,2);
          const ipClassC = sliceIp.join('.') + ".0.0/16";
          const autoBlockIpClassCByMaxClick = accountAds.setting.autoBlackListIpRanges.autoBlockIpClassCByMaxClick || AccountAdsConstant.setting.autoBlockIpClassCByMaxClick;
          const countIpClassC = await countClickIpClassC(accountAds, ipClassC);
          const totalClickClassC = countIpClassC[0] ? countIpClassC[0].totalClick : 0;

          logger.info('jobs::autoBlockIp::Info ip class C.', { id, totalClickClassC });
          if(totalClickClassC >= autoBlockIpClassCByMaxClick)
          {
            logger.info('jobs::autoBlockIp::Block ip class C.', { id, ipInfo: JSON.stringify(countIpClassC) });
            ip = countIpClassC[0] ? countIpClassC[0]._id : ip;
            ipRangesFlag = 1;
            message = MESSAGE.blockIpByGroup;
          }
        }

        const ipRangesClassD = accountAds.setting.autoBlackListIpRanges.classD;

        if (ipRangesFlag === 0 && ipRangesClassD) {
          const sliceIp = splitIp.slice(0,3);
          const ipClassD = sliceIp.join('.') + ".0/24";
          const autoBlockIpClassDByMaxClick = accountAds.setting.autoBlackListIpRanges.autoBlockIpClassDByMaxClick || AccountAdsConstant.setting.autoBlockIpClassDByMaxClick;
          const countIpClassD = await countClickIpClassD(accountAds, ipClassD);
          const totalClickClassD = countIpClassD[0] ? countIpClassD[0].totalClick : 0;

          logger.info('jobs::autoBlockIp::Info ip class D.', { id, totalClickClassD });
          if(totalClickClassD >= autoBlockIpClassDByMaxClick)
          {
            logger.info('jobs::autoBlockIp::Block ip class D.', { id, ipInfo: JSON.stringify(countIpClassD) });
            ip = countIpClassD[0] ? countIpClassD[0]._id : ip;
            ipRangesFlag = 1;
            message = MESSAGE.blockIpByGroup;
          }
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

                    if (maxClick === -1 || countClick < maxClick) {
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

        return await saveIpIntoDB(isConnected, accountAds, ip, key, id, message, log, channel, msg);
    } catch (e) {
        logger.error('jobs::autoBlockIp::error', e);
        channel.ack(msg);
        return;
    }
};
