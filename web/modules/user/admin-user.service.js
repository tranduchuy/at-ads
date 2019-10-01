const log4js = require('log4js');
const UserModel = require('../user/user.model');
const GlobalConstant = require('../../constants/global.constant');
const logger = log4js.getLogger(GlobalConstant.LoggerTargets.Service);
const AccountAdsModel = require('../account-adwords/account-ads.model');
const GoogleAdsErrorModel = require('../google-ads-error/google-ads-error.model');
const WebsiteModel = require('../website/website.model');

const Mongoose = require('mongoose');

const getUsersListForAdminPage = (email, name, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getUsersListForAdminPage::is Called', { email, name, page, limit });
        try
        {
            let matchStage = { $match: {}};

            if(email)
            {
                matchStage.$match.email = { 
                    $regex: email,
                    $options: 'g'
                };
            }
            if(name)
            {
                matchStage.$match.name = { 
                    $regex: name,
                    $options: 'g'
                };
            }
        
            const facetStage = {
                $facet:
                    {
                        entries: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit }
                        ],
                        meta   : [
                            { $group: { _id: null, totalItems: { $sum: 1 } } },
                        ],
                    }
            };
        
            const query = email || name ? [matchStage, facetStage] : [facetStage];

            logger.info('Admin/UserService::getUsersListForAdminPage::query\n', JSON.stringify(query));

            const usersList = await UserModel.aggregate(query);
            return res(usersList);
        }catch(e){
            logger.error('Admin/UserService::getUsersListForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

const getAccountsListForAdminPage = (userId, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getAccountsListForAdminPage::is Called', { userId, page, limit });
        try
        {
            const user = new Mongoose.Types.ObjectId(userId);
            const matchStage = { 
                $match: {
                    user
                }
            };
        
            const facetStage = {
                $facet:
                    {
                        entries: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit }
                        ],
                        meta   : [
                            { $group: { _id: null, totalItems: { $sum: 1 } } },
                        ],
                    }
            };
        
            const query = userId ? [matchStage, facetStage] : [facetStage];

            const accountsList = await AccountAdsModel.aggregate(query);

            logger.info('Admin/UserService::getAccountsListForAdminPage::query\n', JSON.stringify(query));

            return res(accountsList);
        }catch(e){
            logger.error('Admin/UserService::getAccountsListForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

const getErrorListForAdminPage = (page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getErrorListForAdminPage::is Called', { page, limit });
        try
        {
            const sortStage = {
                $sort: {
                    createdAt: -1
                }
            };

            const facetStage = {
                $facet:
                    {
                        entries: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit }
                        ],
                        meta   : [
                            { $group: { _id: null, totalItems: { $sum: 1 } } },
                        ],
                    }
            };
        
            const query = [sortStage, facetStage];

            const errorList = await GoogleAdsErrorModel.aggregate(query);

            logger.info('Admin/UserService::getErrorListForAdminPage::query\n', JSON.stringify(query));

            return res(errorList);
        }catch(e){
            logger.error('Admin/UserService::getErrorListForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

const getWebsitesForAdminPage = (userId, accountsId, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getWebsitesForAdminPage::is Called', { userId, accountsId, page, limit });
        try
        {
            let accountsList = [];
            
            if(accountsId)
            {
                accountsList.push(new Mongoose.Types.ObjectId(accountsId));
            }

            if(userId)
            {
                const usersList = await AccountAdsModel.find({user: new Mongoose.Types.ObjectId(userId)});

                if(usersList.length > 0)
                {
                    const userIdsList = usersList.map(user => user._id);
                    accountsList = accountsList.concat(userIdsList);
                }
            }

            const matchStage = {
                $match: {
                    accountAd: {
                        $in: accountsList
                    }
                }
            }

            const facetStage = {
                $facet:
                    {
                        entries: [
                            { $skip: (page - 1) * limit },
                            { $limit: limit }
                        ],
                        meta   : [
                            { $group: { _id: null, totalItems: { $sum: 1 } } },
                        ],
                    }
            };
        
            const query = accountsList.length > 0 ? [matchStage ,facetStage] : [facetStage];

            const websitesList = await WebsiteModel.aggregate(query);

            logger.info('Admin/UserService::getWebsitesForAdminPage::query\n', JSON.stringify(query));

            return res(websitesList);
        }catch(e){
            logger.error('Admin/UserService::getWebsitesForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

module.exports = {
    getUsersListForAdminPage,
    getAccountsListForAdminPage,
    getErrorListForAdminPage,
    getWebsitesForAdminPage
};
