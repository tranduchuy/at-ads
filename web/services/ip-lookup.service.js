const fetch = require('node-fetch');
const apiEndpoint = 'https://www.iplocate.io/api/lookup/{ip}';
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const NetworkCompany = require('../constants/networkCompany.constant');

const getNetworkCompanyByIP = async (ip) => {
  logger.info('IPLookupService::getIpInfo was called with: ' + JSON.stringify(ip));

  const uri = apiEndpoint.replace('{ip}', ip);
  try {
    const res = await fetch(uri);
    const data = await res.json();

    if(!data.org)
    {
      return {
        name: null,
        value: -1
      };
    }

    if(NetworkCompany[data.org])
    {
      return {
        name: NetworkCompany[data.org].name,
        value: NetworkCompany[data.org].value
      };
    }

    return {
      name: data.org,
      value: null
    };
  } catch (e) {
    logger.error(`IPLookupService::getIpInfo error: ${JSON.stringify(e)}. ip: ${JSON.stringify(ip)}`);
    return null;
  }
};
module.exports = {
  getNetworkCompanyByIP
};
