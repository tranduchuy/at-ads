const amqp = require('amqplib/callback_api');
const express = require('express');
const rabbitMQConfig = require('config').get('rabbitMQ');
const app = express();
const { port } = require('./constants/appJobs.constant');
const url = 'amqp://' + rabbitMQConfig.host + ':' + rabbitMQConfig.port;

const autoBlockIpJobFn = require('./jobs/auto-block-ip');
amqp.connect(url, (error, connection) => {
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
    const queues = [
      'DEV_BLOCK_IP',
      'DEV_DETECT_SESSION',
      'DEV_REMOVE_BLOCK_IP'
    ];
    
    queues.forEach(q => {
      channel.assertQueue(q, {
        durable: false
      });

      channel.consume(q, (msg) => {
        console.log(" [x] Received %s", msg.content.toString());

        switch (q) {
          case 'DEV_BLOCK_IP':
            autoBlockIpJobFn(msg);
            break;
        }
      }, {
          noAck: true
        });
    });
  });
});

app.listen(port, err => {
    if (err)
        return console.error(err);
    console.log(`Server is listening on port ${port}`);
});

