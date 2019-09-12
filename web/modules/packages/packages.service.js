const PackagesConstant = require('./packages.constant');

const Async = require('async');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const checkPackegesTableAndInsertData = (packagesModel) => {
    logger.info("PackagesService::checkPackegesTableAndInsertData::Is called");
    try{

        const nameArr = [
            PackagesConstant.name.vip1,
            PackagesConstant.name.vip2,
            PackagesConstant.name.vip3,
            PackagesConstant.name.vip4,
        ];
        
        checkPackageExistsInDB(packagesModel, nameArr);
    }catch(e){
        logger.error("PackagesService::checkPackegesTableAndInsertData::error", e);
        console.log(e);
        return;
    }
};

const getPackageInfo = (name) => {
    let packageInfo = {}

    switch(name){
        case PackagesConstant.name.vip1 :
            packageInfo = {
                name: PackagesConstant.name.vip1,
                price: PackagesConstant.price.aMonth,
                numOfDays: PackagesConstant.numOfDay.aMonth
            };
            break;
        case PackagesConstant.name.vip2 :
            packageInfo = {
                name: PackagesConstant.name.vip2,
                price: PackagesConstant.price.threeMonth,
                numOfDays: PackagesConstant.numOfDay.threeMonth
            };
            break;
        case PackagesConstant.name.vip3 :
            packageInfo = {
                name: PackagesConstant.name.vip3,
                price: PackagesConstant.price.sixMonth,
                numOfDays: PackagesConstant.numOfDay.sixMonth
            };
            break;
        case PackagesConstant.name.vip4 :
            packageInfo = {
                name: PackagesConstant.name.vip4,
                price: PackagesConstant.price.aYear,
                numOfDays: PackagesConstant.numOfDay.aYear
            };
            break;
        default:
            break;
    }

    return packageInfo;
};

const savePackageIntoDB = (packagesModel, packagesArr) => {
    Async.series([
        (cb) => {
            if(packagesArr.length === 0)
            {
               return cb(null);
            }
            
            packagesModel.create(packagesArr, (err) => {
                if (err)
                {
                    logger.error("PackagesService::checkPackegesTableAndInsertData::error", err);
                    console.log(err);
                    return cb(err);
                } 

                return cb()
            });
        }
    ], err => {
        if(err)
        {
            logger.error("PackagesService::checkPackegesTableAndInsertData::error", err);
            console.log(err);
            return;
        }

        logger.info("PackagesService::checkPackegesTableAndInsertData::insert Packages success.");
        return;
    });
};

const checkPackageExistsInDB = (packagesModel, nameArr) => {
    let packagesArr = [];

    Async.eachSeries(nameArr, (name, callback) => {
        packagesModel.findOne({name}, (err, package) => {
            if(err)
            {
                logger.error("PackagesService::checkPackegesTableAndInsertData::error", err);
                console.log(err);
                return callback(err);
            }

            if(!package)
            {
                packagesArr.push(getPackageInfo(name));
                return callback();
            }

            callback(null);
        });
    }, error => {
        if(error)
        {
            logger.error("PackagesService::checkPackegesTableAndInsertData::error", error);
            console.log(error);
            return;
        }

        savePackageIntoDB(packagesModel, packagesArr);
    });
};

module.exports = {
    checkPackegesTableAndInsertData
}
