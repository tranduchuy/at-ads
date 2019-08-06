const amqp = require('amqplib/callback_api');
const rabbitMQConfig = require('config').get('rabbitMQ');
const BlockingCriterionsModel = require('../modules/blocking-criterions/blocking-criterions.model');
const log4js = require('log4js');
const logger = log4js.getLogger('Service');
const _ = require('lodash');
const RABBIT_MQ_NAMES = require('../config/rabbit-mq-channels');
const uri = [
  'amqp://',
  rabbitMQConfig.username,
  ':',
  rabbitMQConfig.password,
  '@',
  rabbitMQConfig.host,
  ':',
  rabbitMQConfig.port
].join('');

const connectRabbitMQ = (queueName, cb) => {
  console.log('rabbitMQ uri', uri);
  amqp.connect(uri, function (err, conn) {
    if (err) {
      return cb(err);
    }
    console.log('Connect to RabbitMQ successfully');
    conn.createChannel(function (err, ch) {
      if (err) {
        return cb(err);
      }

      ch.assertQueue(queueName, {durable: true});
      return cb(null, ch, conn);
    });
  });
};

const detectSession = (logId) => {
  connectRabbitMQ(RABBIT_MQ_NAMES.DEV_DETECT_SESSION, (err, channel, conn) => {
    if (err) {
      console.error(`Cannot connect queue ${RABBIT_MQ_NAMES.DEV_DETECT_SESSION}`, err);
      return;
    }

    const message = {
      logId
    };
    channel.sendToQueue(RABBIT_MQ_NAMES.DEV_DETECT_SESSION, Buffer.from(JSON.stringify(message)));
    console.log(`Send queue ${RABBIT_MQ_NAMES.DEV_DETECT_SESSION} message: ${JSON.stringify(message)}`);
  });
};

const sendMessages  = (queue, message) => {
  amqp.connect(rabbitMQConfig.uri, (err, conn) => {
    if(err)
    {
        logger.error('rabbitMQService::sendMessages:error ', err);
        return;
    }
    conn.createChannel((e, chn) => {
        if(e)
        {
            logger.error('rabbitMQService::sendMessages:error ', e);
            return;
        }
        chn.assertQueue(queue, {durable: true});
        chn.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        logger.info('rabbitMQService::sendMessages: Msg was send');
    });
    setTimeout(() => {
        conn.close();
        process.exit(0);
    }, 500);
  });
};

const addIpAndCriterionIdInAutoBlackListIp = (accountInfo, callback) => {
  if(!accountInfo.result)
  {
    return callback(null);
  }
  const criterionId = accountInfo.result.value[0].criterion.id;
  const ip = accountInfo.ip;
  const campaignId = accountInfo.campaignId;
  const accountId = accountInfo.accountId;
  const adsId = accountInfo.adsId;
  const updateQuery = {accountId, campaignId};
  const updateingData ={ip, criterionId, createdAt: new Date()};

  BlockingCriterionsModel
  .update(updateQuery,{$push: {autoBlackListIp: updateingData}})
  .exec(err=>{
    if(err)
    {
      logger.error('rabbitMQService::addIpAndCriterionIdInAutoBlackListIp:error ', err);
      return callback(err);
    }
    const logData = {adsId, campaignId, ip};
    logger.info('rabbitMQService::addIpAndCriterionIdInAutoBlackListIp: ', logData);
    callback();
  });
};

/**
 *
 * @param {{customBlackList: array, autoBlackListIp: array, sampleBlockingip: string}} blackList
 * @param {Array} ip
 */
const checkIpIsBlackListed = (blackList, ip) => {
  if(blackList.ipInSampleBlockIp)
  {
    blackList.customBlackList = blackList.customBlackList.concat(blackList.sampleBlockingip);
  }

  blackList.customBlackList = blackList.customBlackList.concat(blackList.autoBlackListIp);

  return _.intersection(blackList.customBlackList, ip);
};

module.exports = {
  connect: connectRabbitMQ,
  sendMessages,
  addIpAndCriterionIdInAutoBlackListIp,
  checkIpIsBlackListed,
  detectSession
};
