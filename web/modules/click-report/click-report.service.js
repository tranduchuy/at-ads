const ClicksReportModel = require('./click-report.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');

const getReportByGclId = async (gclIdList) => {
    logger.info('AccountAdsController::getReportByGclId::is called', {gclIdList});
    try{
        const query = {
            $match: {
                gclId: {
                    $in: gclIdList
                }
            }
        };

        logger.info('AccountAdsController::getReportByGclId::query', {query: JSON.stringify(query)});
        const result = await ClicksReportModel.aggregate([query]);

        return result;
    }catch(e){
        throw e;
    }
};

const mapCLickReportIntoUserLogs = (ClickReport, userLogs) => {
    ClickReport.forEach(report => {
        userLogs.forEach(user => {
            if(report.gclId == user.gclid)
            {
                user.gclidInfo = report;
            }
        });
    });

    return userLogs;
};

module.exports ={
    getReportByGclId,
    mapCLickReportIntoUserLogs
}