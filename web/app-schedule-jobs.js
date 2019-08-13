const express = require('express');
const app = express();
const config = require('config');
const db = require('./database/db');
const removeIp = require('./schedule-jobs/remove-ip-in-auto-blackList');
const updateCampaignName = require('./schedule-jobs/update-campaign-name');

const {updateNetworkCompany} = require('./schedule-jobs/update-network-company');

// config log4js
const log4js = require('log4js');
log4js.configure('./config/log4js.json');

db(() => {
  console.log('Connect to mongodb successfully');
  const port = config.get('appScheduleJobs').port;
  app.listen(port, err => {
    if (err)
    return console.error(err);

    console.log(`Server is listening on port ${port}`);
    removeIp();
    updateCampaignName();
    updateNetworkCompany();
  });
});
