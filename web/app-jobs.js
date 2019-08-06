const amqp = require('amqplib/callback_api');
const express = require('express');
const rabbitMQConfig = require('config').get('rabbitMQ');
const app = express();
const { queues } = require('./constants/queues-rabbitMQ.constant');
const config = require('config');
const Async = require('async');
const db = require('./database/db');
const autoBlockIpJobFn = require('./jobs/auto-block-ip');

db(() => {
  console.log('Connect to mongodb successfully');
  const port = config.get('appJob').port;
  app.listen(port, err => {
      if (err)
          return console.error(err);

      console.log(`Server is listening on port ${port}`);

      amqp.connect(rabbitMQConfig.uri, (error, connection) => {
        if (error) {
          console.log(error);
          return;
        }
        connection.createChannel((error1, channel) => {
          if (error1) {
            console.log(error1);
            return;
          }
      
          console.log('RabbitMQ is waiting..');
      
          queues.forEach(q => {
            channel.assertQueue(q, {
              durable: true
            });
          
            channel.consume(q, async msg => {
              console.log(" [x] Received %s", msg.content.toString());
      
              switch (q) {
                case 'DEV_BLOCK_IP':
                  await autoBlockIpJobFn(channel, msg);
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

