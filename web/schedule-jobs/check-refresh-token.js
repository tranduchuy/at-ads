const schedule = require('node-schedule');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');

const config = require('config');
const checkRefreshTokenTime = config.get('appScheduleJobs').checkRefreshToken;
const UserModel = require('../modules/user/user.model');
const AdsAccountService = require('../modules/account-adwords/account-ads.service');
const moment = require('moment');

const checkRefreshTokenOfUser = async(user, callback) => {
    logger.info('scheduleJobs::checkRefreshTokenOfUser is called\n', {userId: user._id, email: user.email});
    try{
        const tokenExpiresAt = user.expiryDateOfRefreshToken;
        const refreshToken   = user.googleRefreshToken;
        const now            = moment();

        if(refreshToken == '' || !refreshToken || !tokenExpiresAt || now.isAfter(moment(tokenExpiresAt)) || !user.isRefreshTokenValid)
        {
            user.isRefreshTokenValid = false;
            await user.save();
            
            logger.info('scheduleJobs::checkRefreshTokenOfUser: refresh token expired');
            return callback();
        }

        AdsAccountService.getAccessTokenFromGoogle(refreshToken)
        .then(async result => {
            user.googleAccessToken = result.access_token;
            await user.save();

            logger.info('scheduleJobs::checkRefreshTokenOfUser: refresh token unexpired');
            return callback();

        }).catch(async error => {
            user.isRefreshTokenValid = false;
            await user.save();

            logger.info('scheduleJobs::checkRefreshTokenOfUser: refresh token expired');
            return callback();
        });
    }catch(e){
        logger.error('scheduleJobs::checkRefreshTokenOfUser:error', e);
        console.log(JSON.stringify(e));
        return callback();
    }
};

module.exports =  () => {
    schedule.scheduleJob(checkRefreshTokenTime, async() => {
        logger.info('scheduleJobs::checkRefreshToken is called');
        try{
            const users = await UserModel.find();

            if(users.length === 0)
            {
                logger.info('scheduleJobs::checkRefreshToken::NotFoundUsers');
                return;
            }
            
            Async.eachSeries(users, (user, callback) => {
                checkRefreshTokenOfUser(user, callback);
            }, err => {
                if(err)
                {
                    logger.error('scheduleJobs::checkRefreshToken::error', err);
                    console.log(JSON.stringify(err));
                    return;
                }
                logger.info('scheduleJobs::checkRefreshToken::success');
                return;
            });
        }
        catch{
            logger.error('scheduleJobs::checkRefreshToken::error', e);
            console.log(JSON.stringify(e));
            return;
        } 
    });
};