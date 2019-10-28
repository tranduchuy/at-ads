const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const UserModel = require('../user/user.model');
const Async = require('async');
const moment = require('moment');

const verifyThatTheUserHasUserLicences = async (model) => {
  try {
    logger.info('UserLicencesService::verifyThatTheUserHasUserLicences::called\n');
    const users = await UserModel.find();
    if(users.length > 0)
    {
      const UsersLicencesArray = [];
      Async.eachSeries(users, (user, callback) => {
        model.findOne({userId: user._id}).then(result => {
          if(result)
          {
            return callback();
          }

          const userLicences = new model({
            userId: user._id,
            expiredAt: new Date(moment().add(1, 'M').endOf('day'))
          });

          UsersLicencesArray.push(userLicences);
          callback();
        }).catch(e => {
          return callback();
        })
      },async err => {
        if(err)
        {
          logger.error('UserLicencesService::verifyThatTheUserHasUserLicences::Error', e);
        }
        if(UsersLicencesArray.length > 0)
        {
          await model.insertMany(UsersLicencesArray);
        }

        logger.info('UserLicencesService::verifyThatTheUserHasUserLicences::success\n');
      });
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  verifyThatTheUserHasUserLicences
};
