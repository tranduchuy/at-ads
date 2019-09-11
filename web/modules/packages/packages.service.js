const PackagesConstant = require('./packages.constant');

const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const checkPackegesTableAndInsertData = async (packagesModel) => {
    logger.info("PackagesService::checkPackegesTableAndInsertData::Is called");
    try{
        packagesModel.find({}, (err, packages) => {
            if(err)
            {
                logger.error("PackagesService::checkPackegesTableAndInsertData::error", err);
                console.log(err);
                return;
            }
            if(packages.length === 0)
            {
                logger.info("PackagesService::checkPackegesTableAndInsertData::packages empty");

                const data = [
                    {name: PackagesConstant.name.vip1, price: PackagesConstant.price.aMonth, numOfDay: PackagesConstant.numOfDay.aMonth},
                    {name: PackagesConstant.name.vip2, price: PackagesConstant.price.threeMonth, numOfDay: PackagesConstant.numOfDay.threeMonth},
                    {name: PackagesConstant.name.vip3, price: PackagesConstant.price.sixMonth, numOfDay: PackagesConstant.numOfDay.sixMonth},
                    {name: PackagesConstant.name.vip4, price: PackagesConstant.price.aYear, numOfDay: PackagesConstant.numOfDay.aYear}
                ]
                packagesModel.insertMany(data, (error) => {
                    if(error)
                    {   
                        logger.error("PackagesService::checkPackegesTableAndInsertData::error", error);
                        console.log(error);
                        return;
                    }
                }); 
            }
            logger.info("PackagesService::checkPackegesTableAndInsertData::insert Packages success.");
            return;
        });
    }catch(e){
        logger.error("PackagesService::checkPackegesTableAndInsertData::error", e);
        console.log(e);
        return;
    }
}

module.exports = {
    checkPackegesTableAndInsertData
}