const WebsiteModel = require('./website.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const mongoose = require('mongoose');
const crypto = require('crypto');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const Mongoose = require('mongoose');
const UserModel = require('../../modules/user/user.model');
const WebsiteConstant = require('./website.constant');

const moment = require('moment');

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) == index;
};

/**
 *
 * @param {string} domain
 * @param {string} accountId
 * @returns {Promise<void>}
 */
const createDomain = async ({ domain, accountId }) => {
  let flag = true;
  while (flag) {
    const code = crypto.randomBytes(3).toString('hex');
    const website = await WebsiteModel.findOne({ code });
    if (!website) {
      flag = false;
      const newDomain = new WebsiteModel({
        domain,
        accountAd: mongoose.Types.ObjectId(accountId),
        code
      });
      return await newDomain.save();
    }
  }
};

/**
 *
 * @param {string} accountId
 * @returns {Promise<[{domain: string, code: string, expiredAt: Date, status: number}]>} list website.
 */
const getWebsitesByAccountId = async accountId => {
  const websites = await WebsiteModel.find({
    accountAd: mongoose.Types.ObjectId(accountId)
  });

  return websites;
};

/**
 *
 * @param {ObjectId}accountId
 * @param {ObjectId}userId
 * @returns {Promise<boolean>}
 */
const isOwnDomain = async (accountId, userId) => {
  const account = await AccountAdsModel.findById(accountId);
  return account.user.toString() === userId.toString();
};

const getAllDomainNames = async () => {
  const websites = await WebsiteModel.find().lean();
  return websites.map(website => website.domain);
};

const getWebsiteByDomain = async domain => {
  try {
    return await WebsiteModel.findOne({ domain }).lean();
  } catch (e) {
    return null;
  }
};

const findWebsite = async codeOrIdOrDomain => {
  return await WebsiteModel.findOne({
    $or: [
      { _id: codeOrIdOrDomain },
      { code: codeOrIdOrDomain },
      { domain: codeOrIdOrDomain }
    ]
  });
};

/**
 * Get list websites for admin page case search by adId
 * @param {string} adsId
 * @param {number} page
 * @param {number} limit
 */
const getWebsiteInfoforAdminPageWhenFindByAdsId = async (
  adsId,
  page,
  limit
) => {
  try {
    logger.info(
      'Admin/UserService::getWebsiteInfoforAdminPageWhenFindByAdsId::is called',
      { adsId, page, limit }
    );
    let entries = [];
    let totalItems = 0;

    const accountList = await AccountAdsModel.find({
      adsId: { $regex: adsId, $options: 'g' }
    });
    if (accountList.length > 0) {
      let accountIds = accountList.map(account => account._id);
      const websiteList = await getWebsitesForAdminPage(
        accountIds,
        page,
        limit
      );

      if (websiteList[0].entries.length > 0) {
        entries = websiteList[0].entries;
        totalItems = websiteList[0].meta[0].totalItems;
        entries = mapAdsAccountIntoWebsiteList(entries, accountList);
        let userList = accountList
          .map(account => account.user.toString())
          .filter(onlyUnique);
        userList = userList.map(user => new Mongoose.Types.ObjectId(user));
        const users = await UserModel.find({ _id: { $in: userList } });
        entries = mapUserListIntoWebsiteList(entries, users);
      }
    }

    return { entries, totalItems };
  } catch (e) {
    logger.error(
      'Admin/UserService::getWebsiteInfoforAdminPageWhenFindByAdsId::error',
      e
    );
    throw e;
  }
};

/**
 * Get list websites for admin case search by user email
 * @param {string} email
 * @param {number} page
 * @param {number} limit
 */
const getWebsiteInfoforAdminPageWhenFindByEmail = async (
  email,
  page,
  limit
) => {
  logger.info(
    'Admin/UserService::getWebsiteInfoforAdminPageWhenFindByEmail::is called',
    { email, page, limit }
  );
  try {
    let entries = [];
    let totalItems = 0;

    const userList = await UserModel.find({
      email: { $regex: email, $options: 'g' }
    });
    if (userList.length > 0) {
      const userId = userList.map(user => user._id);
      const adsAccount = await AccountAdsModel.find({ user: { $in: userId } });

      if (adsAccount.length > 0) {
        const accountIds = adsAccount
          .map(account => account._id.toString())
          .filter(onlyUnique)
          .map(account => new Mongoose.Types.ObjectId(account));
        const websiteList = await getWebsitesForAdminPage(
          accountIds,
          page,
          limit
        );
        if (websiteList.length > 0) {
          entries = websiteList[0].entries;
          totalItems = websiteList[0].meta[0].totalItems;
          entries = mapAdsAccountIntoWebsiteList(entries, adsAccount);
          entries = mapUserListIntoWebsiteList(entries, userList);
        }
      }
    }

    return { entries, totalItems };
  } catch (e) {
    logger.error(
      'Admin/UserService::getWebsiteInfoforAdminPageWhenFindByEmail::error',
      e
    );
    throw e;
  }
};

/**
 * Get list website for admin page
 * @param {string} adsId
 * @param {string} email
 * @param {number} page
 * @param {number} limit
 */
const getWebsiteInfoforAdminPage = (adsId, email, page, limit) => {
  logger.info('Admin/UserService::getWebsiteInfoforAdminPage::is Called', {
    adsId,
    page,
    limit
  });
  return new Promise(async (resolve, rej) => {
    try {
      let entries = [];
      let totalItems = 0;

      if (adsId) {
        const result = await getWebsiteInfoforAdminPageWhenFindByAdsId(
          adsId,
          page,
          limit
        );
        entries = result.entries;
        totalItems = result.totalItems;
      } else if (email) {
        const result = await getWebsiteInfoforAdminPageWhenFindByEmail(
          email,
          page,
          limit
        );
        entries = result.entries;
        totalItems = result.totalItems;
      } else {
        const data = await getWebsitesForAdminPage([], page, limit);

        if (data[0].entries.length > 0) {
          entries = data[0].entries;
          totalItems = data[0].meta[0].totalItems;
          let adsAccount = entries
            .map(ads => ads.accountAd.toString())
            .filter(onlyUnique);
          adsAccount = adsAccount.map(ads => new Mongoose.Types.ObjectId(ads));
          const accountList = await AccountAdsModel.find({
            _id: { $in: adsAccount }
          });

          if (accountList.length > 0) {
            entries = mapAdsAccountIntoWebsiteList(entries, accountList);
            let userIds = accountList
              .map(account => account.user.toString())
              .filter(onlyUnique);
            userIds = userIds.map(user => new Mongoose.Types.ObjectId(user));
            const userList = await UserModel.find({ _id: userIds });

            if (userList.length > 0) {
              entries = mapUserListIntoWebsiteList(entries, userList);
            }
          }
        }
      }

      return resolve({ entries, totalItems });
    } catch (e) {
      logger.error('Admin/UserService::getWebsiteInfoforAdminPage::error', e);
      return rej(e);
    }
  });
};

const getWebsitesForAdminPage = (accountIds, page, limit) => {
  return new Promise(async (res, rej) => {
    logger.info('Admin/UserService::getWebsitesForAdminPage::is Called', {
      accountIds,
      page,
      limit
    });
    try {
      const matchStage = {
        $match: {
          accountAd: {
            $in: accountIds
          }
        }
      };

      const facetStage = {
        $facet: {
          entries: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $group: { _id: null, totalItems: { $sum: 1 } } }]
        }
      };

      const query =
        accountIds.length > 0 ? [matchStage, facetStage] : [facetStage];

      const websitesList = await WebsiteModel.aggregate(query);

      logger.info(
        'Admin/UserService::getWebsitesForAdminPage::query\n',
        JSON.stringify(query)
      );

      return res(websitesList);
    } catch (e) {
      logger.error('Admin/UserService::getWebsitesForAdminPage::error\n', e);
      return rej(e);
    }
  });
};

const mapAdsAccountIntoWebsiteList = (websiteList, adsAccount) => {
  websiteList.forEach(website => {
    adsAccount.forEach(ads => {
      if (website.accountAd.toString() == ads._id.toString()) {
        website.accountInfo = ads;
      }
    });
  });

  return websiteList;
};

const mapUserListIntoWebsiteList = (websitesList, usersList) => {
  websitesList.forEach(website => {
    usersList.forEach(user => {
      if (website.accountInfo) {
        if (website.accountInfo.user.toString() === user._id.toString()) {
          website.userInfo = user;
        }
      }
    });
  });

  return websitesList;
};

const filterFakeCustomerData = async (req, websiteInfo) => {
  try{
    logger.info('WebsiteServices::filterFakeCustomerData::is called');
    const isEnabled = req.body.isEnabled;
    const runningDevices = req.body.runningDevices;
    const positionOnPage = req.body.positionOnPage;
    const autoDisplayTime = req.body.autoDisplayTime;
    const avatarType = req.body.avatarType;
    const title = req.body.title;
    const body = req.body.body;
    const pageUrl = req.body.pageUrl;
    const themeColor = req.body.themeColor;
    const shape = req.body.shape;

    if(isEnabled == true || isEnabled == false)
    {
      websiteInfo.fakeCustomerConfig['isEnabled'] = isEnabled;
    }

    if(runningDevices)
    {
      websiteInfo.fakeCustomerConfig['runningDevices'] = runningDevices;
    }

    if(positionOnPage)
    {
      websiteInfo.fakeCustomerConfig['positionOnPage'] = positionOnPage;
    }

    if(autoDisplayTime)
    {
      websiteInfo.fakeCustomerConfig['autoDisplayTime'] = autoDisplayTime;
    }

    if(avatarType)
    {
      websiteInfo.fakeCustomerConfig['avatarType'] = avatarType;
    }

    if(title)
    {
      websiteInfo.fakeCustomerConfig['title'] = title;
    }

    if(title == "")
    {
      websiteInfo.fakeCustomerConfig['title'] = WebsiteConstant.fakeCustomerConfig.title;
    }

    if(body)
    {
      websiteInfo.fakeCustomerConfig['body'] = body;
    }

    if(body == "")
    {
      websiteInfo.fakeCustomerConfig['body'] = WebsiteConstant.fakeCustomerConfig.body;
    }

    if(pageUrl)
    {
      websiteInfo.fakeCustomerConfig['pageUrl'] = pageUrl;
    }

    if(pageUrl == "")
    {
      websiteInfo.fakeCustomerConfig['pageUrl'] = "";
    }

    if(themeColor)
    {
      websiteInfo.fakeCustomerConfig['themeColor'] = themeColor;
    }

    if(shape)
    {
      websiteInfo.fakeCustomerConfig['shape'] = shape;
    }
    
    await websiteInfo.save();
    logger.info('WebsiteServices::filterFakeCustomerData::success');
    return websiteInfo;
  }catch(e){
    logger.error('WebsiteServices::filterFakeCustomerData::error', e);
    throw new Error(e);
  }
}

module.exports = {
  createDomain,
  getWebsitesByAccountId,
  isOwnDomain,
  getAllDomainNames,
  getWebsiteByDomain,
  findWebsite,
  getWebsitesForAdminPage,
  getWebsiteInfoforAdminPage,
  filterFakeCustomerData
};
