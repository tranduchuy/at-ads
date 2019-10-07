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

const getAccountsListForAdminPage = (userIds, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getAccountsListForAdminPage::is Called', { userIds, page, limit });
        try
        {
            const matchStage = { 
                $match: {
                    user: {
                        $in: userIds
                    }
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
        
            const query = userIds.length > 0 ? [matchStage, facetStage] : [facetStage];

            const accountsList = await AccountAdsModel.aggregate(query);

            logger.info('Admin/UserService::getAccountsListForAdminPage::query\n', JSON.stringify(query));

            return res(accountsList);
        }catch(e){
            logger.error('Admin/UserService::getAccountsListForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

const getWebsitesForAdminPage = (accountIds, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getWebsitesForAdminPage::is Called', { accountIds, page, limit });
        try
        {
            const matchStage = {
                $match: {
                    accountAd: {
                        $in: accountIds
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
        
            const query = accountIds.length > 0 ? [matchStage ,facetStage] : [facetStage];

            const websitesList = await WebsiteModel.aggregate(query);

            logger.info('Admin/UserService::getWebsitesForAdminPage::query\n', JSON.stringify(query));

            return res(websitesList);
        }catch(e){
            logger.error('Admin/UserService::getWebsitesForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

const onlyUnique = (value, index, self) => {
    return self.indexOf(value) == index;
};

const mapAdsAccountWithUserAccount = (adsAccount ,userAccount) => {
    adsAccount.forEach(ads => {
        userAccount.forEach(user => {
            if(ads.user.toString() == user._id.toString())
            {
                ads.userInfo = user;
            }
        });
    });

    return adsAccount;
}

const mapAdsAccountWithWebsiteList = (adsAccount, websiteList) => {
    adsAccount.forEach(ads => {
        let websiteArr = []
        websiteList.forEach(website => {
            if(ads._id.toString() == website.accountAd.toString())
            {
                websiteArr.push(website)
            }
        });

        if(websiteArr.length > 0)
        {
            ads.websiteInfo = websiteArr;
        }
    });

    return adsAccount;
}

const mapAdsAccountIntoWebsiteList = (websiteList, adsAccount) => {
    websiteList.forEach(website => {
        adsAccount.forEach(ads => {
            if(website.accountAd.toString() == ads._id.toString())
            {
                website.accountInfo = ads;
            }
        });
    });

    return websiteList;
};

const mapUserListIntoWebsiteList = (websitesList, usersList) => {
    websitesList.forEach(website => {
        usersList.forEach(user => {
            if(website.accountInfo)
            {
                if(website.accountInfo.user.toString() === user._id.toString())
                {
                    website.userInfo = user;
                }
            }
        });
    });

    return websitesList;
};

const getWebsiteInfoforAdminPage = (adsId, email, page, limit) => {
    logger.info('Admin/UserService::getWebsiteInfoforAdminPage::is Called', { adsId, page, limit });
    return new Promise( async(resolve, rej) => {
        try{
            let entries = [];
            let totalItems = 0;

            if(adsId)
            {
                const result = await getWebsiteInfoforAdminPageWhenFindByAdsId(adsId, page, limit);
                entries      = result.entries;
                totalItems   = result.totalItems;
            }
            else if(email)
            {
                const result = await getWebsiteInfoforAdminPageWhenFindByEmail(email, page, limit);
                entries      = result.entries;
                totalItems   = result.totalItems;
            }
            else
            {
                const data = await getWebsitesForAdminPage([], page, limit);
    
                if(data[0].entries.length > 0)
                {
                    entries           = data[0].entries;
                    totalItems        = data[0].meta[0].totalItems;
                    let adsAccount    = entries.map(ads => ads.accountAd.toString()).filter(onlyUnique);
                    adsAccount        = adsAccount.map(ads => new Mongoose.Types.ObjectId(ads));
                    const accountList = await AccountAdsModel.find( { _id: { $in: adsAccount } } );
    
                    if(accountList.length > 0)
                    {
                        entries        = mapAdsAccountIntoWebsiteList(entries, accountList);
                        let userIds    = accountList.map(account => account.user.toString()).filter(onlyUnique);
                        userIds        = userIds.map(user => new Mongoose.Types.ObjectId(user));
                        const userList = await UserModel.find({ _id: userIds });
    
                        if(userList.length  > 0)
                        {
                            entries = mapUserListIntoWebsiteList(entries, userList);
                        }
                    }
                }
            }

            return resolve({entries, totalItems});

        }catch(e){
            logger.error('Admin/UserService::getWebsiteInfoforAdminPage::error', e);
            return rej(e);
        }
    });
};

const getWebsiteInfoforAdminPageWhenFindByAdsId = async (adsId, page, limit) => {
    try{
        logger.info('Admin/UserService::getWebsiteInfoforAdminPageWhenFindByAdsId::is called', {adsId, page, limit});
        let entries = [];
        let totalItems = 0;

        const accountList = await AccountAdsModel.find( { adsId: { $regex: adsId, $options: 'g' } } );
        if(accountList.length > 0)
        {
            let accountIds    = accountList.map(account => account._id);
            const websiteList = await getWebsitesForAdminPage(accountIds, page, limit);
            
            if(websiteList[0].entries.length > 0)
            {
            entries      = websiteList[0].entries;
            totalItems   = websiteList[0].meta[0].totalItems;
            entries      = mapAdsAccountIntoWebsiteList(entries, accountList);
            let userList = accountList.map(account => account.user.toString()).filter(onlyUnique);
            userList     = userList.map(user => new Mongoose.Types.ObjectId(user));
            const users  = await UserModel.find({ _id :  { $in: userList } });
            entries      = mapUserListIntoWebsiteList(entries, users);
            }
        }

        return {entries, totalItems};
    }catch(e){
        logger.error('Admin/UserService::getWebsiteInfoforAdminPageWhenFindByAdsId::error', e);
        throw e;
    }
};

const getWebsiteInfoforAdminPageWhenFindByEmail = async (email, page, limit) => {
    logger.info('Admin/UserService::getWebsiteInfoforAdminPageWhenFindByEmail::is called', {email, page, limit});
    try{
        let entries = [];
        let totalItems = 0;

        const userList = await UserModel.find( { email: { $regex: email, $options: 'g' } } );
        if(userList.length > 0)
        {
            const userId     = userList.map(user => user._id);
            const adsAccount = await AccountAdsModel.find({user: { $in : userId}});
            
            if(adsAccount.length > 0)
            {
                const accountIds  = adsAccount.map(account => account._id.toString()).filter(onlyUnique).map(account => new Mongoose.Types.ObjectId(account));
                const websiteList = await getWebsitesForAdminPage(accountIds, page, limit);
                if(websiteList.length > 0)
                {
                    entries    = websiteList[0].entries;
                    totalItems = websiteList[0].meta[0].totalItems;
                    entries    = mapAdsAccountIntoWebsiteList(entries, adsAccount);
                    entries    = mapUserListIntoWebsiteList(entries, userList);
                }
            }
        }

        return {entries, totalItems};
    }catch(e){
        logger.error('Admin/UserService::getWebsiteInfoforAdminPageWhenFindByEmail::error', e);
        throw e;
    }
}

const getAccountInfoforAdminPage = (email, page, limit) => {
    logger.info('Admin/UserService::getAccountInfoforAdminPage::is Called', { email, page, limit });
    return new Promise( async (resolve, rej) => {
        try{
            let entries = [];
            let totalItems = 0;

            if(email)
            {
               const result = await getAccountInfoforAdminPageWhenFindByEmail(email, page, limit);
               entries      = result.entries;
               totalItems   = result.totalItems; 
            }
            else
            {
                const data = await getAccountsListForAdminPage([], page, limit);

                if(data[0].entries.length > 0)
                {
                    entries           = data[0].entries;
                    totalItems        = data[0].meta[0].totalItems;
                    const adsIds      = entries.map(ads => ads._id);
                    let userList      = entries.map(ads => ads.user.toString()).filter(onlyUnique);
                    userList          = userList.map(ads => new Mongoose.Types.ObjectId(ads));
                    const usersInfo   = await UserModel.find({_id: {$in : userList}});
                    const websiteList = await WebsiteModel.find({accountAd: {$in: adsIds}});
                    entries           = mapAdsAccountWithUserAccount(entries, usersInfo);
                    entries           = mapAdsAccountWithWebsiteList(entries, websiteList);
                }
            }

            return resolve({entries, totalItems});
        }catch(e){
            logger.error('Admin/UserService::getAccountInfoforAdminPage::error', e);
            return rej(e);
        }
    });
};

const getAccountInfoforAdminPageWhenFindByEmail = async (email, page, limit) => {
    logger.info('Admin/UserService::getAccountInfoforAdminPageWhenFindByEmail::is called', {email, page, limit});
    try{
        let entries = [];
        let totalItems = 0;

        const userList = await UserModel.find({email: {$regex: email, $options: 'g' }});

        if(userList.length > 0)
        {
            entries           = userList;
            totalItems        = userList.length;
            const userIds     = entries.map(user => user._id);
            const adsList     = await getAccountsListForAdminPage(userIds, page, limit);
            const accountList = adsList[0].entries;
            if(accountList.length > 0)
            {
                let accountId     = adsList[0].entries.map(ads => ads.user.toString()).filter(onlyUnique);
                accountId         = accountId.map(ads => new Mongoose.Types.ObjectId(ads));
                entries           = mapAdsAccountWithUserAccount(accountList, entries);
                const adsIds      = accountList.map(ads => ads._id);
                const websiteList = await WebsiteModel.find({accountAd: {$in: adsIds}});
                entries           = mapAdsAccountWithWebsiteList(entries, websiteList);
            }
        }

        return {entries, totalItems};
    }catch(e){
        logger.error('Admin/UserService::getAccountInfoforAdminPageWhenFindByEmail::error', e);
        throw e;
    }
};

module.exports = {
    getUsersListForAdminPage,
    getAccountsListForAdminPage,
    getWebsitesForAdminPage,
    onlyUnique,
    mapAdsAccountWithUserAccount,
    mapAdsAccountWithWebsiteList,
    mapAdsAccountIntoWebsiteList,
    mapUserListIntoWebsiteList,
    getWebsiteInfoforAdminPage,
    getAccountInfoforAdminPage
};
