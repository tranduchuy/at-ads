const UserBehaviorLogModel = require('./user-behavior-log.model');

const createUserBehaviorLog = async ({
                                       ip, utmMedium, utmSource, utmCampaign,
                                       referrer, userAgent, browser, engine,
                                       device, os, cpu, domain, pathname,
                                     }) => {
  try {
    const newUserBehaviorLog = new UserBehaviorLogModel({
      ip,
      referrer,
      userAgent,
      domain,
      pathname,
      utmCampaign: utmCampaign || null,
      utmMedium: utmMedium || null,
      utmSource: utmSource || null,
      browser: browser || null,
      engine: engine || null,
      device: device || null,
      os: os || null,
      cpu: cpu || null
    });

    return await newUserBehaviorLog.save();
  } catch (e) {
    console.log(e);
    return e;
  }
};

module.exports = {
  createUserBehaviorLog
};
