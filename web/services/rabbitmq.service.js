/*const amqp = require('amqplib/callback_api');
const config = require('config');
const rabbitMQConfig = config.get('rabbitmq');
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
].join('');*/

const connectRabbitMQ = (queueName, cb) => {
/*  console.log('rabbitMQ uri', uri);
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
  });*/
};

/**
 *
 * @param {string[]} saleIds
 * @param {number} updateField
 */
const updateAdRank = (saleIds, updateField) => {
/*  // updateField should be CLICK or IMPRESSION
  connectRabbitMQ(RABBIT_MQ_NAMES.UPDATE_AD_RANK_OF_SALES, (err, channel, conn) => {
    if (err) {
      console.error(`Cannot connect queue ${RABBIT_MQ_NAMES.UPDATE_AD_RANK_OF_SALES}`, err);
      return;
    }

    const message = {
      saleIds,
      updateField
    };

    channel.sendToQueue(RABBIT_MQ_NAMES.UPDATE_AD_RANK_OF_SALES, new Buffer(JSON.stringify(message)));
    console.log(`Send queue ${RABBIT_MQ_NAMES.UPDATE_AD_RANK_OF_SALES} message: ${JSON.stringify(message)}`);
  });*/
};

/**
 *
 * @param {string[]} saleIds
 * @param {{utmSource, utmCampaign, utmMedium, browser, referrer, version, device, os}} logData
 * @param {string} type
 */
const insertAdStatHistory = (saleIds, logData, type) => {
/*  // type should be: VIEW or CLICK
  connectRabbitMQ(RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE, (err, channel, conn) => {
    if (err) {
      console.error(`Cannot connect queue ${RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE}`, err);
      return;
    }

    const message = {
      saleIds,
      logData,
      type
    };
    channel.sendToQueue(RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE, new Buffer(JSON.stringify(message)));
    console.log(`Send queue ${RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE} message: ${JSON.stringify(message)}`);
  });*/
};

const detectSession = (logId) => {
  /*  // type should be: VIEW or CLICK
  connectRabbitMQ(RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE, (err, channel, conn) => {
    if (err) {
      console.error(`Cannot connect queue ${RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE}`, err);
      return;
    }

    const message = {
      saleIds,
      logData,
      type
    };
    channel.sendToQueue(RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE, new Buffer(JSON.stringify(message)));
    console.log(`Send queue ${RABBIT_MQ_NAMES.INSERT_VIEW_STAT_WHEN_VIEW_SALE} message: ${JSON.stringify(message)}`);
  });*/
};

module.exports = {
  connect: connectRabbitMQ,
  updateAdRank,
  insertAdStatHistory,
  detectSession
};
