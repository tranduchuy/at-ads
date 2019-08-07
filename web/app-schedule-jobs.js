const express = require('express');
const app = express();
const config = require('config');
const db = require('./database/db');
const removeIp = require('./schedule-jobs/remove-ip-in-auto-blackList');

db(() => {
  console.log('Connect to mongodb successfully');
  const port = config.get('appScheduleJobs').port;
  app.listen(port, err => {
    if (err)
    return console.error(err);

    console.log(`Server is listening on port ${port}`);
    removeIp();
  });
});