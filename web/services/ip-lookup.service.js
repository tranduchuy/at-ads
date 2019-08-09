const fetch = require('node-fetch');
const apiEndpoint = 'http://ip-api.com/json/{ip}';

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
  console.log('IPLookupService::getIpInfo was called with: ' + JSON.stringify(ip));

  const uri = apiEndpoint.replace('{ip}', ip);
  try {
    const res = await fetch(uri);
    const data = await res.json();
    const company = companies.find(company => {
      const as = data.as.toLowerCase();
      return as.indexOf(company.name) !== -1;
    });
    if (company) {
      return company;
    } else if (data.as) {
      return {
        name: data.as,
        value: null
      }
    } else{
      return null;
    }
  } catch (e) {
    console.log(`getIpInfo error: ${JSON.stringify(e)}. ip: ${JSON.stringify(ip)}`);
    return null;
  }
};
module.exports = {
  getNetworkCompanyByIP
};
