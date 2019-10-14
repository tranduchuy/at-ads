const amqp = require('amqplib/callback_api');
const express = require('express');
const app = express();
const config = require('config');
const db = require('./database/db');

// config log4js
const log4js = require('log4js');
log4js.configure('./config/log4js.json');

// RabbitMQ's config
const rabbitMQConfig = config.get('rabbitMQ');
const rabbitChannels = config.get('rabbitChannels');
const queues = Object.values(rabbitChannels);

// Job functions
const autoBlockIpJobFn = require('./jobs/auto-block-ip');
const detectSessionFn = require('./jobs/detect-session');
const countRequestGoogle = require('./jobs/count-request-google');

// sendGrid
const SendGrid = require('./services/send-grid.service');
const SendGridConfig = config.get('SENDGRID');

db(() => {
  console.log('Connect to mongodb successfully');
  const port = config.get('appJob').port;
  app.listen(port, err => {
      if (err)
          return console.error(err);

      console.log(`Server is listening on port ${port}`);

      amqp.connect(rabbitMQConfig.uri, async (error, connection) => {
        if (error) {
          const title = 'Phần mềm của bạn đang gặp vấn đề.';
          const info  = {
            service: 'RabbitMQ ERROR',
            error  : error
          };

          await SendGrid.sendErrorMessage(SendGridConfig.TO, title, 'hello', info);
          console.log(error);
          return;
        }
        connection.createChannel((error1, channel) => {
          if (error1) {
            console.log(error1);
            return;
          }
      
          console.log('RabbitMQ is waiting..');
          
          channel.prefetch(1);
  
          queues.forEach(q => {
            channel.assertQueue(q, {
              durable: true
            });
            channel.consume(q, async msg => {
              console.log(q, " [x] Received %s", msg.content.toString());
      
              switch (q) {
                case rabbitChannels.BLOCK_IP:
                  await autoBlockIpJobFn(channel, msg);
                  break;
                case rabbitChannels.DETECT_SESSION:
                  await detectSessionFn(channel, msg);
                  break;
                case rabbitChannels.COUNT_REQUEST_GOOGLE:
                  await countRequestGoogle(channel, msg);
                  break;
              }
            }, {
                noAck: false
              });
          });
        });
      });
  });
});

