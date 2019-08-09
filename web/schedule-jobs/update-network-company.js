const config = require('config');
const schedule = require('node-schedule');
const timeConfig = config.get('update_log_network_company');
const UserBehaviorLogModel = require('../modules/user-behavior-log/user-behavior-log.model');
const UPDATE_LOG_NETWORK_COMPANY_TIMER = timeConfig.interval_time_check; // minute

const IPLookupService = require('../services/ip-lookup.service');

const findLogScheduleNeedToBeUpdate = async () => {
  return await UserBehaviorLogModel.find({networkCompany: null}).limit(100);
};

const processUpdateLogNetworkCompany = async (logSchedules) => {
  await Promise.all(logSchedules.map(async (log) => {
      console.log(`WORKER::UpdateLogNetworkCompany::processUpdateLogNetworkCompany. Update log ip ${log.ip}`);

      const company = await IPLookupService.getNetworkCompanyByIP(log.ip);

      if (company !== null){
        log.networkCompany = company;
      } else {
        log.networkCompany = null;
      }
      await log.save();

      console.log(`WORKER::UpdateLogNetworkCompany::processUpdateLogNetworkCompany. Finish updating log ip ${log.ip}. networkCompany ${log.networkCompany}`);
  }));
};

const updateNetworkCompany = async () => {
  console.log('WORKER::UpdateLogNetworkCompany::Init');

  schedule.scheduleJob(`${UPDATE_LOG_NETWORK_COMPANY_TIMER} * * * *`, async () => {
    console.log('WORKER::UpdateLogNetworkCompany::Start at', new Date());
    try {
      const logSchedules = await findLogScheduleNeedToBeUpdate();
      await processUpdateLogNetworkCompany(logSchedules);
    } catch (e) {
      console.log('WORKER::UpdateLogNetworkCompany::error', e);
    }
  });
};

module.exports = {
  updateNetworkCompany
};
