const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');

const getGeoIp = (req) => {
  logger.info('TrackingSerives::getGeoIp::is called');
  try{
    const ip = requestIp.getClientIp(req);
    const location = geoip.lookup(ip);

    return {ip, location};
  }catch(e){
    logger.error('TrackingSerives::getGeoIp::error', e);
    throw new Error(e);
  }
};

const detectAdsInfo = (req) => {
  try{
    const info = {
      url: req.query.url || null,
      campaignId: req.query.click_campaignid || null,
      keyword: req.query.click_keyword || null,
      gclid: req.query.click_gclid || null,
      location: req.query.click_location || null,
      matchType: req.query.click_matchtype || null,
      adPosition : req.query.click_adposition || null,
      network: req.query.click_network || null,
      gb: req.query.gb || null
    }

    return info;
  }catch(e){
    logger.error('TrackingSerives::getGeoIp::error', e);
    throw new Error(e);
  }
}

module.exports = {
  getGeoIp,
  detectAdsInfo
}