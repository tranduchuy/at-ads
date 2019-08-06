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
        return e;
    }
};


const checkSessionExpiration = async (session) => {
    const searchDate = new Date();
    searchDate.setMinutes(searchDate.getMinutes() - 30);

    const createdAt = new Date(session.createdAt);

    const inDate =  new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDay(), 23, 59, 59, 59);

    return moment(searchDate).isAfter(session.lastHitAt) && moment(inDate).isBefore(session.lastHitAt);
};



const detectSession = async (data) => {
    try {
        const {logId} = data;
        const log = await getDetailLogById(logId);
        if (!log) {
            console.log('detectSession::detectSession::notFound. Sale not found, sale id', logId);
            return;
        }

        let session = await getSessionByLogId({
            ip: log.ip,
            uuid: log.uuid,
            accountKey: log.accountKey
        });

        if(session && checkSessionExpiration(session)){
            session.lastHitAt = log.createdAt;
            log.session = session._id;
            await log.save();
            await session.save();
        } else {
            if(session && session.lastHitAt){
                session.endedAt = session.lastHitAt;
                await session.save();
            }
            session = await createSession({
                ip: log.ip,
                uuid: log.uuid,
                accountKey: log.accountKey
            });
            session.lastHitAt = log.createdAt;
            log.session = session._id;
            await log.save();
            await session.save();
        }
    } catch (e) {
        console.log('detectSession::detectSession', e);
    }


};

module.exports = async (msg) => {
    try {
        const data = JSON.parse(msg.content.toString());
        await detectSession(data);
    } catch (e) {
        console.log(e);
    }
};
