const log4js = require('log4js');
const UserModel = require('../user/user.model');
const GlobalConstant = require('../../constants/global.constant');
const logger = log4js.getLogger(GlobalConstant.LoggerTargets.Service);
const AccountAdsModel = require('../account-adwords/account-ads.model');
const GoogleAdsErrorModel = require('../google-ads-error/google-ads-error.model');
const UserLicencesModel = require('../user-licences/user-licences.model');
const WebsiteModel = require('../website/website.model');
const PackagesModel = require('../packages/packages.model');

const Mongoose = require('mongoose');

const getUsersListForAdminPage = (email, name, page, limit) => {
  return new Promise(async (res, rej) => {
    logger.info('Admin/UserService::getUsersListForAdminPage::is Called', {
      email,
      name,
      page,
      limit
    });
    try {
      let matchStage = { $match: {} };

      if (email) {
        matchStage.$match.email = {
          $regex: email,
          $options: 'g'
        };
      }
      if (name) {
        matchStage.$match.name = {
          $regex: name,
          $options: 'g'
        };
      }

      const sortStage =  {
        $sort: {
          'createdAt': -1
        }
      };

      const facetStage = {
        $facet: {
          entries: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $group: { _id: null, totalItems: { $sum: 1 } } }]
        }
      };

      const query = email || name ? [matchStage, sortStage, facetStage] : [sortStage, facetStage];

      logger.info(
        'Admin/UserService::getUsersListForAdminPage::query\n',
        JSON.stringify(query)
      );

      const usersList = await UserModel.aggregate(query);
      return res(usersList);
    } catch (e) {
      logger.error('Admin/UserService::getUsersListForAdminPage::error\n', e);
      return rej(e);
    }
  });
};

const getAccountsListForAdminPage = (userIds, page, limit) => {
  return new Promise(async (res, rej) => {
    logger.info('Admin/UserService::getAccountsListForAdminPage::is Called', {
      userIds,
      page,
      limit
    });
    try {
      const matchStage = {
        $match: {
          user: {
            $in: userIds
          }
        }
      };
      const sortStage = {
        $sort: {
          'createdAt': -1
        }
      };
      const facetStage = {
        $facet: {
          entries: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $group: { _id: null, totalItems: { $sum: 1 } } }]
        }
      };
      const query =
        userIds.length > 0 ? [matchStage, sortStage, facetStage] : [sortStage, facetStage];

      const accountsList = await AccountAdsModel.aggregate(query);

      logger.info(
        'Admin/UserService::getAccountsListForAdminPage::query\n',
        JSON.stringify(query)
      );

      return res(accountsList);
    } catch (e) {
      logger.error(
        'Admin/UserService::getAccountsListForAdminPage::error\n',
        e
      );
      return rej(e);
    }
  });
};

const onlyUnique = (value, index, self) => {
  return self.indexOf(value) == index;
};

const mapAdsAccountWithUserAccount = (adsAccount, userAccount) => {
  adsAccount.forEach(ads => {
    userAccount.forEach(user => {
      if (ads.user.toString() == user._id.toString()) {
        ads.userInfo = user;
      }
    });
  });

  return adsAccount;
};

const getAccountInfoforAdminPage = (email, page, limit) => {
  logger.info('Admin/UserService::getAccountInfoforAdminPage::is Called', {
    email,
    page,
    limit
  });
  return new Promise(async (resolve, rej) => {
    try {
      let entries = [];
      let totalItems = 0;

      if (email) {
        const result = await getAccountInfoforAdminPageWhenFindByEmail(
          email,
          page,
          limit
        );
        entries = result.entries;
        totalItems = result.totalItems;
      } else {
        const data = await getAccountsListForAdminPage([], page, limit);

        if (data[0].entries.length > 0) {
          entries = data[0].entries;
          totalItems = data[0].meta[0].totalItems;
          const adsIds = entries.map(ads => ads._id);
          let userList = entries
            .map(ads => ads.user.toString())
            .filter(onlyUnique);
          userList = userList.map(ads => new Mongoose.Types.ObjectId(ads));
          const usersInfo = await UserModel.find({ _id: { $in: userList } });
          const websiteList = await WebsiteModel.find({
            accountAd: { $in: adsIds }
          });
          entries = mapAdsAccountWithUserAccount(entries, usersInfo);
          entries = mapAdsAccountWithWebsiteList(entries, websiteList);
          const userLicences = await getUserLicences(userList);
          entries = entries.map(user => {
            const userLicence = userLicences.filter(userLicence => user.user.toString() == userLicence.userId.toString());
            user['licence'] = userLicence.length > 0 ? userLicence[0] : {};
            return user;
          })
        }
      }

      return resolve({ entries, totalItems });
    } catch (e) {
      logger.error('Admin/UserService::getAccountInfoforAdminPage::error', e);
      return rej(e);
    }
  });
};

const getAccountInfoforAdminPageWhenFindByEmail = async (
  email,
  page,
  limit
) => {
  logger.info(
    'Admin/UserService::getAccountInfoforAdminPageWhenFindByEmail::is called',
    { email, page, limit }
  );
  try {
    let entries = [];
    let totalItems = 0;

    const userList = await UserModel.find({
      email: { $regex: email, $options: 'g' }
    });

    if (userList.length > 0) {
      entries = userList;
      totalItems = userList.length;
      const userIds = entries.map(user => user._id);
      const adsList = await getAccountsListForAdminPage(userIds, page, limit);
      const accountList = adsList[0].entries;

      if (accountList.length > 0) {
        let accountId = adsList[0].entries
          .map(ads => ads.user.toString())
          .filter(onlyUnique);
        accountId = accountId.map(ads => new Mongoose.Types.ObjectId(ads));
        entries = mapAdsAccountWithUserAccount(accountList, entries);
        const adsIds = accountList.map(ads => ads._id);
        const websiteList = await WebsiteModel.find({
          accountAd: { $in: adsIds }
        });
        entries = mapAdsAccountWithWebsiteList(entries, websiteList);
      }
    }

    return { entries, totalItems };
  } catch (e) {
    logger.error(
      'Admin/UserService::getAccountInfoforAdminPageWhenFindByEmail::error',
      e
    );
    throw e;
  }
};

const mapAdsAccountWithWebsiteList = (adsAccount, websiteList) => {
  adsAccount.forEach(ads => {
    let websiteArr = [];
    websiteList.forEach(website => {
      if (ads._id.toString() == website.accountAd.toString()) {
        websiteArr.push(website);
      }
    });

    if (websiteArr.length > 0) {
      ads.websiteInfo = websiteArr;
    }
  });

  return adsAccount;
};

const getUserLicences = async userIds => {
  try {
    logger.info('Admin/UserService::getUserLicences::is called');
    return await UserLicencesModel.find({ userId: { $in: userIds } }).populate(
      'packageId'
    );
  } catch (e) {
    logger.error('Admin/UserService::getUserLicences::error', e);
    throw e;
  }
};

const mapUserLicenceIntoUser = async (entries) => {
  logger.info('Admin/UserService::mapUserLicenceIntoUser::is called');
  try{
    const userIds = entries.map(user => user._id);
    let userLicences = await UserLicencesModel.find({userId: {$in: userIds}});
    const userLicenceDefault = {
      "_id": null,
      "userId": null,
      "packageId" : null,
      "histories": [],
      "limitGoogleAd": null,
      "expiredAt": null,
      "createdAt": null,
      "updatedAt": null,
      "__v": null
    };
    const packagesDefault = {
      "interests": [],
      "isContactPrice": null,
      "discountMonths": [],
      "contact": null,
      "isDiscount": null,
      "name": null,
      "price": null,
      "type": null,
      "numOfMonths": null,
    };
    const packages = await PackagesModel.find({});
    entries = entries.map(user => {
      let userLicence = userLicences.filter(userLicence => user._id.toString() == userLicence.userId.toString());
      let package = packagesDefault;

      if(userLicence.length > 0)
      {
        package = packages.filter(package => package._id.toString() == userLicence[0].packageId.toString())
                          .map(package => { return { interests: package.interests,
                                                    isContactPrice: package.isContactPrice,
                                                    discountMonths: package.discountMonths,
                                                    contact: package.contact,
                                                    isDiscount: package.isDiscount,
                                                    name: package.name,
                                                    price: package.price,
                                                    type: package.type,
                                                    numOfMonths: package.numOfMonths
                                                  }});

        package = package[0];
      }
      
      user['licence'] = userLicence.length > 0 ? {...JSON.parse(JSON.stringify(package)), ...JSON.parse(JSON.stringify(userLicence[0]))} : {...JSON.parse(JSON.stringify(package)), ...JSON.parse(JSON.stringify(userLicenceDefault))};                                         
      return user;
    });

    logger.info('Admin/UserService::mapUserLicenceIntoUser::success');
    return entries;
  }catch(e){
    logger.error('Admin/UserService::mapUserLicenceIntoUser::error', e);
    throw new Error(e);
  }
}

module.exports = {
  getUsersListForAdminPage,
  getAccountsListForAdminPage,
  onlyUnique,
  mapAdsAccountWithUserAccount,
  getAccountInfoforAdminPage,
  getUserLicences,
  mapUserLicenceIntoUser
};
