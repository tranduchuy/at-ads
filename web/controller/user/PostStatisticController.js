const _ = require('lodash');
const URL = require('url');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');

const AdStatModel = require('../../models/ad-stat-history');
const HttpCode = require('../../config/http-code');

const getStatByReferrerType = async (req, res, next) => {
  try {
    const result = {
      status: HttpCode.SUCCESS,
      message: "Success",
      data: {
        statistic: {
          view: {},
          impression: {},
          click: {}
        }
      }
    }
    result.data.statistic.view[global.REFERRER_TYPE.GOOGLE_ORGANIC] = 0;
    result.data.statistic.view[global.REFERRER_TYPE.GOOGLE_ADS] = 0;
    result.data.statistic.view[global.REFERRER_TYPE.FACEBOOK_ORGANIC] = 0;
    result.data.statistic.view[global.REFERRER_TYPE.FACEBOOK_ADS] = 0;
    result.data.statistic.view[global.REFERRER_TYPE.HECTA] = 0;
    result.data.statistic.view[global.REFERRER_TYPE.OTHER] = 0;

    result.data.statistic.impression[global.REFERRER_TYPE.GOOGLE_ORGANIC] = 0;
    result.data.statistic.impression[global.REFERRER_TYPE.GOOGLE_ADS] = 0;
    result.data.statistic.impression[global.REFERRER_TYPE.FACEBOOK_ORGANIC] = 0;
    result.data.statistic.impression[global.REFERRER_TYPE.FACEBOOK_ADS] = 0;
    result.data.statistic.impression[global.REFERRER_TYPE.HECTA] = 0;
    result.data.statistic.impression[global.REFERRER_TYPE.OTHER] = 0;

    result.data.statistic.click[global.REFERRER_TYPE.GOOGLE_ORGANIC] = 0;
    result.data.statistic.click[global.REFERRER_TYPE.GOOGLE_ADS] = 0;
    result.data.statistic.click[global.REFERRER_TYPE.FACEBOOK_ORGANIC] = 0;
    result.data.statistic.click[global.REFERRER_TYPE.FACEBOOK_ADS] = 0;
    result.data.statistic.click[global.REFERRER_TYPE.HECTA] = 0;
    result.data.statistic.click[global.REFERRER_TYPE.OTHER] = 0;

    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const sale_id = req.query.sale_id;

    const adStats = await AdStatModel.find({
      sale: sale_id,
      createdAt: {
        $gt: start_date,
        $lt: end_date
      }
    });

    adStats.map(($) => {
      const hostname = URL.parse($.referrer).hostname;
      let logType = "other";
      if ($.type == global.AD_STAT_VIEW) logType = "view";
      if ($.type == global.AD_STAT_IMPRESSION) logType = "impression";
      if ($.type == global.AD_STAT_CLICK) logType = "click";

      if (_.includes(hostname, "google")) {
        if (_.isNil($.utmSource)) result.data.statistic[logType][global.REFERRER_TYPE.GOOGLE_ORGANIC]++;
        else result.data.statistic[logType][global.REFERRER_TYPE.GOOGLE_ADS]++;
      }

      else if (_.includes(hostname, "facebook")) {
        if (_.isNil($.utmSource)) result.data.statistic[logType][global.REFERRER_TYPE.FACEBOOK_ORGANIC]++;
        else result.data.statistic[logType][global.REFERRER_TYPE.FACEBOOK_ADS]++;
      }

      else if (_.includes(hostname, "hecta")) result.data.statistic[logType][global.REFERRER_TYPE.HECTA]++;

      else result.data.statistic[logType][global.REFERRER_TYPE.OTHER]++;
    });

    return res.json(result);
  } catch (error) {
    logger.info('UserController::getStatByReferrerType::error', error);
    return next(error);
  }

}

const getStatByTimeRange = async (req, res, next) => {
  try {
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;
    const sale_id = req.query.sale_id;

    const adStats = await AdStatModel.find({
      sale: sale_id,
      createdAt: {
        $gt: start_date,
        $lt: end_date
      }
    });

    const result = {
      status: HttpCode.SUCCESS,
      message: "Success",
      data: {
        statistic: {}
      }
    }

    adStats.map(($) => {
      let logType = "other";
      if ($.type == global.AD_STAT_VIEW) logType = "view";
      if ($.type == global.AD_STAT_IMPRESSION) logType = "impression";
      if ($.type == global.AD_STAT_CLICK) logType = "click";
      const date = $.createdAt.toISOString().split('T')[0];

      if (!_.isNil(result.data.statistic[date])) result.data.statistic[date][logType]++;
      else {
        result.data.statistic[date] = {};
        result.data.statistic[date][logType] = 1;
      }
    })

    return res.json(result);
  } catch (error) {
    logger.info('UserController::getStatByTimeRange::error', error);
    return next(error);
  }

}

const getPostStat = (req, res, next) => {
  const start_date = req.query.start_date;
  const end_date = req.query.end_date;
  const sale_id = req.query.sale_id;
  if (_.isNil(start_date) || _.isNil(end_date) || _.isNil(sale_id)) throw new Error("Thiếu thông tin thống kê");

  if (req.query.groupBy === "referrerType") return getStatByReferrerType(req, res, next);
  if (req.query.groupBy === "timeRange") return getStatByTimeRange(req, res, next);
  return next(new Error("Not support this statistic yet"));
}

module.exports = {
  getPostStat
}