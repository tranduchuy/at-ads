const UserBehaviorLogsModel = require('../modules/user-behavior-log/user-behavior-log.model');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const GoogleAdsService = require('../services/GoogleAds.service');
const RabbitMQService = require('../services/rabbitmq.service');
const Async = require('async'); 
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const moment = require('moment');

module.exports = async(channel, msg) => {
    logger.info('jobs::autoBlockIp is called');
    try{
        const infoAfterCatchEvent = JSON.parse(msg.content.toString());
        const isPrivateBrowsing = infoAfterCatchEvent.isPrivateBrowsing;
        const key = infoAfterCatchEvent.accountKey;
        const ip = infoAfterCatchEvent.ip;
        const accountAds = await AccountAdsModel.findOne({key});

        if(!accountAds)
        {
            logger.info('jobs::autoBlockIp::accountAdsNotFound.');
            channel.ack(msg);
            return;
        }

        const backList = { 
            customBlackList: accountAds.setting.customBlackList,
            autoBlackListIp: accountAds.setting.autoBlackListIp,
            sampleBlockingIp: accountAds.setting.sampleBlockingIp
        };
        const ips = RabbitMQService.checkIpIsBlackListed(backList, [ip]);

        if(ips.length!== 0)
        {
            logger.info('jobs::autoBlockIp::ipExistsInBlackList.');
            channel.ack(msg);
            return;
        }

        const query = {accountId: accountAds._id};
        const campaignsOfAccount = await BlockingCriterionsModel.find(query);

        if(campaignsOfAccount.length === 0)
        {
            logger.info('jobs::autoBlockIp::accountAdsWithoutCampaign.');
            channel.ack(msg);
            return;
        }

        const yesterday = moment().subtract(1, 'day').format('MM/DD/YYYY');
        const tomorrow = moment().subtract(-1, 'day').format('MM/DD/YYYY');
        const countQuery = {
            ip,
            type: 1,
            createdAt: {
                $gte: new Date(yesterday.toString()),
                $lt: new Date(tomorrow.toString())
            }
        };

        const countClick = await UserBehaviorLogsModel.countDocuments(countQuery);

        const maxClick = accountAds.setting.autoBlockByMaxClick;

        if(!isPrivateBrowsing)
        {
            if(maxClick === -1 || countClick < maxClick)
            {
                logger.info('jobs::autoBlockIp::success.');
                channel.ack(msg);
                return;
            }
        }
        
        const campaignIds = campaignsOfAccount.map(campaign => campaign.campaignId);
        const adsId = accountAds.adsId;
        const accountId = accountAds._id;

        Async.eachSeries(campaignIds, (campaignId, callback)=> {
            console.log(campaignId + '\n\n\n\n\n');
            GoogleAdsService.addIpBlackList(adsId, campaignId, ip)
              .then((result) => {
                const accountInfo = { result, accountId, campaignId, adsId, ip };
                RabbitMQService.addIpAndCriterionIdInAutoBlackListIp(accountInfo, callback);
              })
              .catch(err => callback(err));
          }, error => {
            if (error) {
              logger.error('jobs::autoBlockIp::error', error);
            //   channel.ack(msg); // TODO: improve call google api limited.
              return;
            }
            
            const updateData = {$push: {"setting.autoBlackListIp": ip}};

            AccountAdsModel
             .update({key}, updateData)
             .exec(err => {
                if(err)
                {
                    logger.error('jobs::autoBlockIp::error', err);
                    channel.ack(msg);
                    return;
                }
                logger.info('jobs::autoBlockIp::success');
                channel.ack(msg);
                return;
             });
          });
    }catch(e){
        logger.error('jobs::autoBlockIp::error', e);
        channel.ack(msg);
        return;
    }
};