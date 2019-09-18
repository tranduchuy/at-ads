const log4js = require('log4js');
const UserModel = require('../user/user.model');
const GlobalConstant = require('../../constants/global.constant');
const logger = log4js.getLogger(GlobalConstant.LoggerTargets.Service);

const getListUserForAdminPage = (email, name, page, limit) => {
    return new Promise( async (res, rej) => {
        logger.info('Admin/UserService::getListUserForAdminPage::is Called', { email, name, page, limit });
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
        
            const projectStage = {
                $project: {
                    user:  '$$ROOT'
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
        
            const query = email || name ? [matchStage, projectStage, facetStage] : [projectStage, facetStage];

            logger.info('Admin/UserService::getListUserForAdminPage::query\n', JSON.stringify(query));

            const usersList = await UserModel.aggregate(query);
            return res(usersList);
        }catch(e){
            logger.error('Admin/UserService::getListUserForAdminPage::error\n', e);
            return rej(e);
        }
    });
};

module.exports = {
    getListUserForAdminPage
};