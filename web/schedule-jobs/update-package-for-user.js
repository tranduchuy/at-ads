const UserLicencesModel = require('../modules/user-licences/user-licences.model');
const PackageModel = require('../modules/packages/packages.model');
const PackageConstant = require('../modules/packages/packages.constant');
const schedule = require('node-schedule');
const log4js = require('log4js');
const logger = log4js.getLogger('Tasks');
const Async = require('async');
const config = require('config');
const timeUpdatePackageForUser = config.get('appScheduleJobs').timeUpdatePackageForUser;
const moment = require('moment');
const AdsAccountModel = require('../modules/account-adwords/account-ads.model');

module.exports = () => {
  schedule.scheduleJob(timeUpdatePackageForUser, async() => {
    try{
      logger.info('Schedulejobs::Update package for user::Is called.');
      const userLicences = await UserLicencesModel.find({});

      if(userLicences.length <= 0)
      {
        logger.info('Schedulejobs::Update package for user::User licences is empty.');
        return;
      }

      const packageFree = await PackageModel.findOne({type: PackageConstant.packageTypes.FREE})

      if(!packageFree)
      {
        logger.info('Schedulejobs::Update package for user::Package free is empty.');
        return;
      }

      const now = moment().endOf('day');

      Async.eachSeries(userLicences, (user, callback) => {
        if(!user.expiredAt)
        {
          logger.info('Schedulejobs::Update package for user::expiredAt is empty', {userId: user.userId});
          return callback();
        }

        const expiredAt = moment(user.expiredAt);

        if(expiredAt.isAfter(now))
        {
          logger.info('Schedulejobs::Update package for user::package still expire', {userId: user.userId});
          return callback();
        }

        const histories = user.histories ? user.histories : [];
        const historyInfo = {
          packageId: packageFree._id,
          name: packageFree.name,
          type: packageFree.type,
          price: packageFree.price,          
          createdAt: new Date()
        };
        histories.push(historyInfo);

        UserLicencesModel.updateOne({userId: user.userId}, {$set: {packageId: packageFree._id, histories, expiredAt: null}}).exec(err=> {
          if(err)
          {
            logger.error('Schedulejobs::Update package for user::Error.', err);
            return callback();
          }

          AdsAccountModel.countDocuments({user: user.userId}).exec((err, numOfAccount) => {
            if(err)
            {
              logger.error('Schedulejobs::Update package for user::count account::Error.', err);
              return callback();
            }

            if(numOfAccount < 2)
            {
              logger.info('Schedulejobs::Update package for user::num of account lt 2.', {userId: user.userId});
              return callback();
            }

            AdsAccountModel.updateMany({user: user.userId}, {$set: {isDisabled: true}}).exec(err=> {
              if(err)
              {
                logger.error('Schedulejobs::Update package for user::update isDisabled for account::Error.', err);
                return callback();
              }
  
              logger.info('Schedulejobs::Update package for user::success', {userId: user.userId});
              return callback();
            });
          });
        });
      }, err => {
        if(err)
        {
          logger.error('Schedulejobs::Update package for user::Error.', err);
          return;
        }

        logger.info('Schedulejobs::Update package for user::success.');
        return;
      });
    }catch(e){
      logger.error('Schedulejobs::Update package for user::Error.', e);
      return;
    }
  });
};