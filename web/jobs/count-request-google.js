const CountRequestGoogleModel = require('../modules/count-request-google/count-request-google.model');
const log4js                  = require('log4js');
const logger                  = log4js.getLogger('Tasks');
const { COUNT }               = require('../modules/count-request-google/count-request-google.constant'); 

module.exports = async (channel, msg) => {
    logger.info('jobs::countRequestGoogle is called');
    try {
        const message = JSON.parse(msg.content.toString());
        const date    = new Date();
        const now     = date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear(); 
        const result  = await CountRequestGoogleModel.findOne({date: now});

        if(!result)
        {
            logger.info('jobs::countRequestGoogle::Record not found');

            let info = {
                date: now
            }
            
            switch (message) {
                case COUNT.isReport:
                    info['countReport'] = 1;
                    break;
                default:
                    info['count'] = 1;
                    break;
            };

            const newRecord = new CountRequestGoogleModel(info);
            
            await newRecord.save();

            logger.info('jobs::countRequestGoogle::Created new record success');
            channel.ack(msg);
            return;
        }

        switch (message) {
            case COUNT.isReport:
                result.countReport = result.countReport + 1;
                break;
            default:
                result.count = result.count + 1;
                break;
        };
        
        await result.save();

        logger.info('jobs::countRequestGoogle::success');
        channel.ack(msg);
        return;
    } catch (e) {
        logger.error('jobs::countRequestGoogle::error', e);
        console.log(e);
        channel.ack(msg);
        return;
    }
};