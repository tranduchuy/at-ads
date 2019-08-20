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

const saveIpIntoAutoBlackListIp = async (key, id, ip) => {
    logger.info('jobs::saveIpIntoAutoBlackListIp::is called', {key, id, ip});
    try{
        const updateData = {$push: {"setting.autoBlackListIp": ip}};
        await AccountAdsModel.updateOne({key}, updateData);
        await updateIsSpamStatus(id);

        return;
    }catch(e){
        logger.error('jobs::saveIpIntoAutoBlackListIp::error', err, {id});
        return;
    }
};

const updateIsSpamStatus = async (id) => {
    logger.info('jobs::updateIsSpamStatus::is called', {id});
    try{
        const queryUpdate = {_id: id};
        const dataUpdate = {$set: {isSpam: true}};

        const query = JSON.stringify({queryUpdate, dataUpdate});
            
        logger.info(`jobs::updateIspamStatus::udpate query ${query}`);
        await UserBehaviorLogsModel.updateOne(queryUpdate, dataUpdate);

        return;
    }catch(e){
        logger.error('jobs::updateIspamStatus::error', e, {id});
        return;
    }
};

module.exports = async(channel, msg) => {
    logger.info('jobs::autoBlockIp is called');
    try{
        const id = JSON.parse(msg.content.toString());
        const log = await UserBehaviorLogsModel.findOne({_id: id});
        
        if(!log)
        {
            logger.info('jobs::autoBlockIp::CannotFindLog.', {id});
            channel.ack(msg);
            return;
        }
        
        const isPrivateBrowsing = log.isPrivateBrowsing;
        const key = log.accountKey;
        const ip = log.ip;
        const accountAds = await AccountAdsModel.findOne({key});

        if(!accountAds)
        {
            logger.info('jobs::autoBlockIp::accountAdsNotFound.', {id});
            channel.ack(msg);
            return;
        }

        const blackList = { 
            customBlackList: accountAds.setting.customBlackList,
            autoBlackListIp: accountAds.setting.autoBlackListIp,
            sampleBlockingIp: accountAds.setting.sampleBlockingIp
        };
        const ips = RabbitMQService.checkIpIsBlackListed(blackList, [ip]);
        const { isConnected } = accountAds; 

        if(ips.length!== 0)
        {
            logger.info('jobs::autoBlockIp::ipExistsInBlackList.', {id});
            channel.ack(msg);
            return;
        }

        const query = {accountId: accountAds._id, isDeleted: false};
        const campaignsOfAccount = await BlockingCriterionsModel.find(query);

        const now = moment().startOf('day');
        const tomorrow = moment(now).endOf('day');

        const countQuery = {
            ip,
            type: LOGGING_TYPES.CLICK,
            createdAt: {
                $gte: new Date(now),
                $lt: new Date(tomorrow)
            }
        };

        const countClick = await UserBehaviorLogsModel.countDocuments(countQuery);
        const maxClick = accountAds.setting.autoBlockByMaxClick;

        if(!isPrivateBrowsing)
        {
            let flag = 0;

            if(log.networkCompany.name)
            {
                const networkCompany = log.networkCompany.name;
                const settingOfViettel = accountAds.setting.mobileNetworks.viettel;
                const settingOfMobifone = accountAds.setting.mobileNetworks.mobifone;
                const settingOfVNPT = accountAds.setting.mobileNetworks.vinafone;
                const settingOfVietnamobile = accountAds.setting.mobileNetworks.vietnammobile;
                const settingOfFpt = accountAds.setting.mobileNetworks.fpt;

                if( networkCompany === NetworkCompanyName.VIETTEL && settingOfViettel ||
                    networkCompany === NetworkCompanyName.MOBIFONE && settingOfMobifone ||
                    networkCompany === NetworkCompanyName.VNPT && settingOfVNPT ||
                    networkCompany === NetworkCompanyName.VIETNAMOBILE && settingOfVietnamobile ||
                    networkCompany === NetworkCompanyName.FPT && settingOfFpt )
                {
                    flag = 1;
                }
            }

            if(flag === 0)
            {
                if(maxClick === -1 || countClick < maxClick || !log.gclid)
                {
                    logger.info('jobs::autoBlockIp::success.', {id});
                    channel.ack(msg);
                    return;
                }
            }
        }
        
        if(isConnected)
        {
            if(campaignsOfAccount.length === 0)
            {
                logger.info('jobs::autoBlockIp::accountAdsWithoutCampaign.', {id});
                channel.ack(msg);
                return;
            }

            const campaignIds = campaignsOfAccount.map(campaign => campaign.campaignId);
            const adsId = accountAds.adsId;
            const accountId = accountAds._id;

            Async.eachSeries(campaignIds, (campaignId, callback)=> {
                GoogleAdsService.addIpBlackList(adsId, campaignId, ip)
                .then((result) => {
                    const accountInfo = { result, accountId, campaignId, adsId, ip };
                    RabbitMQService.addIpAndCriterionIdInAutoBlackListIp(accountInfo, callback);
                }).catch(err => callback(err));
            }, async error => {
                if (error) {
                logger.error('jobs::autoBlockIp::error', error, {id});
                //   channel.ack(msg); // TODO: improve call google api limited.
                return;
                }

                await saveIpIntoAutoBlackListIp(key, id, ip);
                logger.info('jobs::autoBlockIp::sussecc', {id});
                channel.ack(msg);
                return;
            });
        }
        else
        {
            await updateIsSpamStatus(id);
            logger.info('jobs::autoBlockIp::sussecc', {id});
            channel.ack(msg);
            return;
        }
    }catch(e){
        logger.error('jobs::autoBlockIp::error', e);
        channel.ack(msg);
        return;
    }
};