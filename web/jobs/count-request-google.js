const CountRequestGoogleModel = require('../modules/count-request-google/count-request-google.model');
const log4js                  = require('log4js');
const logger                  = log4js.getLogger('Tasks');
const { COUNT }               = require('../modules/count-request-google/count-request-google.constant');
const moment                 = require('moment');

module.exports = async (channel, msg) => {
    logger.info('jobs::countRequestGoogle is called');
    try {
        const message = JSON.parse(msg.content.toString());
        const date    = moment().subtract('hours', 7);
        const now     = date.date() + '-' + (date.month() + 1) + '-' + date.year();
        const result  = await CountRequestGoogleModel.findOne({date: now});

        if(!result)
        {
            logger.info('jobs::countRequestGoogle::Record not found');

            let info = {
                date: now
            }
            
            switch (message.count) {
                case COUNT.isReport:
                    info['countReport'] = parseInt(message.number);
                    break;
                default:
                    info['count'] = parseInt(message.number);
                    break;
            };

            const newRecord = new CountRequestGoogleModel(info);
            
            await newRecord.save();

            logger.info('jobs::countRequestGoogle::Created new record success');
            channel.ack(msg);
            return;
        }

        switch (message.count) {
            case COUNT.isReport:
                result.countReport = result.countReport + parseInt(message.number);
                break;
            default:
                result.count = result.count + parseInt(message.number);
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