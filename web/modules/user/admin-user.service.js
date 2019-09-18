const log4js = require('log4js');
const UserModel = require('../user/user.model');
const GlobalConstant = require('../../constants/global.constant');
const logger = log4js.getLogger(GlobalConstant.LoggerTargets.Service);
const AccountAdsModel = require('../account-adwords/account-ads.model');
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
}

module.exports = {
    getUsersListForAdminPage,
    getAccountsListForAdminPage
};