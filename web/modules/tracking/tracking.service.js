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
    let info = {
      url: req.query.url || null,
      campaignId: req.query.click_campaignid || null,
      keyword: req.query.click_keyword || null,
      gclid: req.query.click_gclid || null,
      location: req.query.click_location || null,
      matchType: req.query.click_matchtype || null,
      adPosition: req.query.click_adposition || null,
      campaignType: req.query.click_network || null,
      gb: req.query.gb || null,
      page: null,
      position: null
    }

    if(req.query.click_matchtype) {
      switch (req.query.click_matchtype) {
        case 'b':
          info['matchType'] = 'Rộng';
          break;
        case 'e':
          info['matchType'] = 'Chính xác';
          break;
        case 'p':
          info['matchType'] = 'Cụm từ';
          break;
        default:
          break;
      };
    }

    if(req.query.click_adposition)
    {
      adposition = req.query.click_adposition.split('t');
      if(adposition.length > 1)
      {
        info['page'] = adposition[0];
        info['position'] = adposition[1];
      }
    }

    if(req.query.click_network)
    {
      switch (req.query.click_network) {
        case 'g':
          info['campaignType'] = 'Google search';
          break;
        case 'd':
          info['campaignType'] = 'Google display';
          break;
        default:
          info['campaignType'] = 'Other';
          break;
      };
    }

    return info;
  }catch(e){
    logger.error('TrackingSerives::getGeoIp::error', e);
    throw new Error(e);
  }
};

module.exports = {
  getGeoIp,
  detectAdsInfo
}