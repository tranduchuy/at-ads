const schedule = require('node-schedule');
const AccountAdsModel = require('../modules/account-adwords/account-ads.model');
const BlockingCriterionsModel =require('../modules/blocking-criterions/blocking-criterions.model');
const GoolgeAdsService = require('../services/GoogleAds.service');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const clickPerformanceReportConstant = require('../constants/clickPerformanceReport.constant');
const ClickReportModel = require('../modules/click-report/click-report.model');
const config = require('config');
const timeGetClickReport = config.get('appScheduleJobs').timeGetClickReport;

const getCampaignInAccount = (accountAds, cb) => {
    const info = {
        adsId:  accountAds.adsId,
        _id: accountAds._id
    };

    logger.info('scheduleJobs::getCampaignInAccount::is called.\n', info);
    try{
        const accountId = accountAds._id;
        const query = {
            accountId,
            isDeleted: false
        };
    
      BlockingCriterionsModel.find(query).exec(async (err, campaigns) => {
          if(err)
          {
              return cb(err);
          }

          if(campaigns.length === 0)
          {
              logger.info('scheduleJobs::getCampaignInAccount::accountAdsWithoutCampaign.\n', info);
              return cb(null);
          }

          const campaignIds = campaigns.map(campaign => campaign.campaignId);
          const adsId = accountAds.adsId;
          const fields = clickPerformanceReportConstant.fiedlsArr;


          GoolgeAdsService.getClickReport(adsId, campaignIds, fields)
          .then(async clickReport => {
            const result = convertClickReportCSVFileToJSON(clickReport);

            if(result.length === 0)
            {
              logger.info('scheduleJobs::getCampaignInAccount::No reports found.\n');
              return cb(null);
            }

            logger.info('scheduleJobs::getCampaignInAccount::success.\n');
            await ClickReportModel.insertMany(result);
            return cb();
          }).catch(err => {
            logger.error('scheduleJobs::getCampaignInAccount::error.', err, info);
            console.log(err);
            return cb();
          });
      });
    }catch(e){
        logger.error('scheduleJobs::getCampaignInAccount::error.', e, info);
        console.log(e);
        return cb(e);
    }
};

const convertClickReportCSVFileToJSON = (report) => {
  logger.info('scheduleJobs::convertClickReportCSVFileToJSON::is called.\n');
  let CSV = report.split('\n');

  if(CSV.length < 3){
    logger.info('scheduleJobs::convertClickReportCSVFileToJSON::No reports found.\n');
    return [];
  }

  const fieldsName = CSV[0].split(',');
  CSV = CSV.slice(1);
  const jsonArr = [];

  CSV.forEach(ele => {
    const temp = ele.split(',');
    temp[0] = clickPerformanceReportConstant.KeyWordMatchType[temp[0]];
    temp[1] = clickPerformanceReportConstant.Device[temp[1]];
    temp[2] = new Date(temp[2]);
    const json = addDataIntoObj(fieldsName, temp);
    jsonArr.push(json);
  });

  jsonArr.pop();
  logger.info('scheduleJobs::convertClickReportCSVFileToJSON::success.\n');
  return jsonArr;
};

const addDataIntoObj = (titleArr, data) => {
  let obj = {};
  titleArr.forEach((title, index) => {
    obj[clickPerformanceReportConstant.nameWillSaveIntoDb[title]] = data[index];
  });

  return obj;
};

module.exports =  () => {
    schedule.scheduleJob(timeGetClickReport, async() => {
        logger.info('scheduleJobs::getClickReport is called');
        try{
            const allAccountAds = await AccountAdsModel.find({isConnected : true, isDeleted: false});

            if(allAccountAds.length === 0)
            {
                logger.info('scheduleJobs::getClickReport::NotAccountAds');
                return;
            }
            
            console.log(allAccountAds.map(ads => ads.adsId));
            Async.eachSeries(allAccountAds, (accountAds, callback) => {
                getCampaignInAccount(accountAds, callback);
            }, err => {
                if(err)
                {
                    logger.error('scheduleJobs::getClickReport::error', err);
                    return;
                }
                logger.info('scheduleJobs::getClickReport::success');
                return;
            });
        }
        catch{
            logger.error('scheduleJobs::getClickReport::error', e);
            console.log(JSON.stringify(e));
            return;
        } 
    });
};