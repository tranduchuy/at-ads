const UserBehaviorLogModel = require('./user-behavior-log.model');


const createUserBehaviorLog = async ({
                                       ip, utmMedium, utmSource, utmCampaign, type,
                                       referrer, userAgent, browser, engine, isPrivateBrowsing,
                                       device, os, cpu, domain, pathname, uuid, accountKey, location,
                                       browserResolution, screenResolution, keyword, href, localIp
                                     }) => {
  try {
    const newUserBehaviorLog = new UserBehaviorLogModel({
      uuid,
      accountKey,
      type,
      href,
      ip,
      referrer,
      localIp,
      userAgent,
      location,
      domain,
      pathname,
      isPrivateBrowsing,
      browserResolution,
      screenResolution,
      keyword,
      utmCampaign: utmCampaign || null,
      utmMedium: utmMedium || null,
      utmSource: utmSource || null,
      browser: browser || null,
      engine: engine || null,
      device: device || null,
      os: os || null,
      cpu: cpu || null,
      createdAt: new Date()
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
