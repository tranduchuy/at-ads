const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const request = require('sync-request')

const getGeoIp = async () => {
  logger.info('TrackingSerives::getGeoIp::is called');
  try{
    const res = request('GET', 'https://geoip-db.com/json/');
    const data = JSON.parse(res.getBody())
    const ip = data.IPv4;
    let userLocation = data;
    delete userLocation.IPv4;

    logger.info('TrackingSerives::getGeoIp::success');
    return { ip, userLocation };
  }catch(e){
    logger.error('TrackingSerives::getGeoIp::error', e);
    throw new Error(e)
  }
};

module.exports = {
  getGeoIp
}