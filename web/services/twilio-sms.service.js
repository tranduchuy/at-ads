const accountSid = 'ACa304a31f9bf687a42169ba5b2f4e33ab';
const authToken = '035a1c3b5754883d24a594586cf8a6bd';

const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const twilio = require('twilio');
const client = new twilio(accountSid, authToken);


const sendSMS = (constent, phoneNumber) => {
  logger.info('Twilio-SMS-Services::sendSMS::is called', { constent, phoneNumber });
  return new Promise((resolve, reject) => {
    try{
      client.messages.create({
          body: constent,
          to: phoneNumber,  // Text this number
          from: "+12565008887"// From a valid Twilio number
      })
      .then(message => {
        logger.info('Twilio-SMS-Services::sendSMS::success', { message: message.sid});
        return resolve('Success');
      }).catch(err => {
        logger.error('Twilio-SMS-Services::sendSMS::error', err);
        return reject(err);
      });
    }catch(e){
      logger.error('Twilio-SMS-Services::sendSMS::error', e);
      return reject(e);
    }
  });
} 

module.exports = {
  sendSMS
}