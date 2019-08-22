const LogModel = require('../modules/user-behavior-log/user-behavior-log.model');
const SessionsModel = require('../modules/sessions/sessions.model');

const moment = require('moment');

const getDetailLogById = async (logId) => {
    return await LogModel.findOne({_id: logId});
};

const getSessionByLogId = async ({uuid, ip, accountKey}) => {
    return await SessionsModel.findOne({uuid, ip, accountKey});
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


const checkSessionExpiration = (session, log) => {
    const searchDate = moment(log.createdAt).subtract(30, 'minutes');

    let inDate = moment(session.createdAt);
    inDate = inDate.set('hour', 23);
    inDate = inDate.set('minute', 59);
    inDate = inDate.set('second', 59);
    inDate = inDate.set('millisecond', 999);

    return searchDate.isBefore(session.lastHitAt) && inDate.isAfter(session.lastHitAt);
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
        if(session){
          if(checkSessionExpiration(session, log)){
            session.lastHitAt = log.createdAt;
            log.session = session._id;
            await log.save();
            await session.save();
          } else {
            // end old session
            if(session.lastHitAt){
              session.endedAt = session.lastHitAt;
              await session.save();
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


