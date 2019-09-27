const WebsiteModel = require('./website.model');
const AccountAdsModel = require('../account-adwords/account-ads.model');
const HistoryTransactionsModel = require('../history-transactions/history-transactions.model');
const mongoose = require('mongoose');
const crypto = require('crypto');

const moment = require('moment');
const WebsitesConstant = require('../website/website.constant');
const PackagesConstant = require('../packages/packages.constant');
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
const getWebsitesByAccountId = async (accountId) => {
  const websites = await WebsiteModel.find({ accountAd: mongoose.Types.ObjectId(accountId) })
    .sort({"expiredAt": -1})

	websites.forEach((website, index) => {
    websites[index].isExpired = isExpired(website);
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

const getAllDomainNames = async ()=> {
  const websites = await WebsiteModel.find().lean();
  return websites.map(website => website.domain);
};

const saveHistoryTransactionsInfo = async ({package, websiteCode, price}) => {
  const historyTransactions = new HistoryTransactionsModel({
    package,
    websiteCode,
    price
  });

  return await historyTransactions.save();
};

const getVipTypeAndExpiredAt = (package, expired) => {
  let vipType = WebsitesConstant.vipType.notTheVip;
  let expiredAt = WebsitesConstant.expiredAt.doesNotExpire;
  const now = moment().startOf('day');
  const expiredDay = moment(expired).startOf('day');

  switch (package.name)
  {
      case PackagesConstant.name.vip1 :
        expiredAt = !expired || expiredDay.isBefore(now) ? WebsitesConstant.expiredAt.aMonth : moment(expired).add(WebsitesConstant.month.aMonth, 'M').endOf('day');
        vipType = WebsitesConstant.vipType.vipWithinAMonth;

        break;
      case PackagesConstant.name.vip2 :
          expiredAt = !expired || expiredDay.isBefore(now) ? WebsitesConstant.expiredAt.threeMonths : moment(expired).add(WebsitesConstant.month.threeMonths, 'M').endOf('day');
          vipType = WebsitesConstant.vipType.vipWithinThreeMonths;
          break;
      case PackagesConstant.name.vip3 :
          expiredAt = !expired || expiredDay.isBefore(now) ? WebsitesConstant.expiredAt.sixMonths : moment(expired).add(WebsitesConstant.month.sixMonths, 'M').endOf('day');
          vipType = WebsitesConstant.vipType.vipWithinSixMonths;
          break;
      case PackagesConstant.name.vip4 :
          expiredAt = !expired || expiredDay.isBefore(now) ? WebsitesConstant.expiredAt.aYear : moment(expired).add(WebsitesConstant.month.aYear, 'M').endOf('day');
          vipType = WebsitesConstant.vipType.vipWithinAYear;
          break;
      default:
          vipType = WebsitesConstant.vipType.notTheVip;
          expiredAt = WebsitesConstant.expiredAt.doesNotExpire;
  }

  return {vipType, expiredAt};
};

const getWebsiteByDomain = async (domain) => {
  try {
    return await WebsiteModel.findOne({domain}).lean();
  } catch (e) {
    return null;
  }
};

const findWebsite = async (codeOrIdOrDomain) => {
  return await WebsiteModel.findOne({
    $or: [
      {_id: codeOrIdOrDomain},
      {code: codeOrIdOrDomain},
      {domain: codeOrIdOrDomain}
    ]
  })
};

const isExpired = (website) => {
  if (!website) {
    return true;
  }

  if (!website.expiredAt) {
    return true;
  }

  const now = moment();
  const expiredAt = moment(website).endOf('day');
  return now.isAfter(expiredAt);
};

module.exports = {
  createDomain,
  getWebsitesByAccountId,
  isOwnDomain,
  getAllDomainNames,
  saveHistoryTransactionsInfo,
  getVipTypeAndExpiredAt,
  getWebsiteByDomain,
  findWebsite,
  isExpired
};
