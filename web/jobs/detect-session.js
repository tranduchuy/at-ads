const LogModel = require('../modules/user-behavior-log/user-behavior-log.model');
const SessionsModel = require('../modules/sessions/sessions.model');

const moment = require('moment');

const getDetailLogById = async (logId) => {
    return await LogModel.findOne({_id: logId});
};

const getSessionByLogId = async ({uuid, ip, accountKey}) => {
    return await SessionsModel.find({uuid, ip, accountKey}).sort({createdAt: -1});
};

const createSession = async ({
                                 ip, uuid, accountKey
                             }) => {
    try {
        const newSession = new SessionsModel({
            ip,
            uuid,
            accountKey
        });
        return await newSession.save();
    } catch (e) {
        console.log(e);
        return null;
    }
};

/**
 * Return true when now time is in 30 minutes before of log AND not pass new day
 * @param session
 * @param log
 * @return {boolean}
 */
const isLogTimeValidInOldSession = (session, log) => {
    const searchDate = moment(log.createdAt).subtract(30, 'minutes');
    const endOfDate = moment(session.createdAt).endOf('date');

    return searchDate.isBefore(session.lastHitAt) && endOfDate.isAfter(session.lastHitAt);
};

const detectSession = async (channel, data, msg) => {
    try {
        const {logId} = data;
        const log = await getDetailLogById(logId);
        if (!log) {
            console.log('detectSession::detectSession::notFound. Sale not found, sale id', logId);
            channel.ack(msg);
            return;
        }

        let session = await getSessionByLogId({
            ip: log.ip,
            uuid: log.uuid,
            accountKey: log.accountKey
        });

        // check session existed
        if(session.length > 0){
          if(isLogTimeValidInOldSession(session[0], log)){
            session[0].lastHitAt = log.createdAt;
            log.session = session[0]._id;
            await log.save();
            await session[0].save();
          } else {
            // end old session
            if(session[0].lastHitAt){
              session[0].endedAt = session[0].lastHitAt;
              await session[0].save();
            }
            // create new session
            session = await createSession({
              ip: log.ip,
              uuid: log.uuid,
              accountKey: log.accountKey
            });
            if(session !== null){
              session.lastHitAt = log.createdAt;
              log.session = session._id;
              await log.save();
              await session.save();
            }
          }
        } else {
            // create new session
            session = await createSession({
                ip: log.ip,
                uuid: log.uuid,
                accountKey: log.accountKey
            });
            if(session !== null){
                session.lastHitAt = log.createdAt;
                log.session = session._id;
                await log.save();
                await session.save();
            }
        }
        channel.ack(msg);
    } catch (e) {
        channel.ack(msg);
        console.log('detectSession::detectSession', e);
    }
};

module.exports = async (channel, msg) => {
    try {
        const data = JSON.parse(msg.content.toString());
        await detectSession(channel, data, msg);
    } catch (e) {
        console.log(e);
        channel.ack(msg);
    }
};


