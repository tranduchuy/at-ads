const schedule = require('node-schedule');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const RemoveIpInAutoBlackListService = require('./remove-ip-in-auto-blackList.service');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeDeleteIpInBlackList = config.get('appScheduleJobs').timeDeleteIpInBlackList;

module.exports =  () => {
    schedule.scheduleJob(timeDeleteIpInBlackList, async() => {
        logger.info('scheduleJobs::removeIpInAutoBlackList is called');
        try{
            const allAccountAds = await AccountAdsModel.find({isDeleted: false, isConnected: true});

            if(allAccountAds.length === 0)
            {
                logger.info('scheduleJobs::removeIpInAutoBlackList::NotAccountAds');
                return;
            }
            
            Async.eachSeries(allAccountAds, (adcountAds, callback) => {
                RemoveIpInAutoBlackListService.deleteIpInAutoBlackListOfAccountAds(adcountAds, callback);
            }, err => {
                if(err)
                {
                    logger.error('scheduleJobs::removeIpInAutoBlackList::error', err);
                    return;
                }
                logger.info('scheduleJobs::removeIpInAutoBlackList::success');
                return;
            });
        }
        catch{
            logger.error('scheduleJobs::removeIpInAutoBlackList::error', e);
            return;
        } 
    });
};