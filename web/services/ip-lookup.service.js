const fetch = require('node-fetch');
const apiEndpoint = 'https://www.iplocate.io/api/lookup/{ip}';
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const companies = [
  {
    name: 'viettel',
    value: 1
  },
  {
    name: 'fpt',
    value: 2
  },
  {
    name: 'vnpt',
    value: 3
  },
  {
    name: 'vinaphone',
    value: 4
  },
  {
    name: 'mobifone',
    value: 5
  }
];

const getNetworkCompanyByIP = async (ip) => {
  logger.info('IPLookupService::getIpInfo was called with: ' + JSON.stringify(ip));

  const uri = apiEndpoint.replace('{ip}', ip);
  try {
    const res = await fetch(uri);
    const data = await res.json();
    const company = companies.find(company => {
      const org = data.org.toLowerCase();
      return org.indexOf(company.name) !== -1;
    });
    if (company) {
      return company;
    } else if (data.org) {
      return {
        name: data.org,
        value: null
      }
    } else{
      return {
        name: null,
        value: -1
      };
    }
  } catch (e) {
    logger.error(`getIpInfo error: ${JSON.stringify(e)}. ip: ${JSON.stringify(ip)}`);
    return null;
  }
};
module.exports = {
  getNetworkCompanyByIP
};
