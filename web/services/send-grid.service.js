const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const config         = require('config');
const SendGridConfig = config.get('SENDGRID');
const sendGrid       = require('@sendgrid/mail');
sendGrid.setApiKey(SendGridConfig.SENDGRID_API_KEY);

const sendErrorMessage = (email, title, content, html) => {
    return new Promise((resolve, reject) => {
        try {
            logger.info('SendGrid/MailService::sendErrorMessage::Is called', {email, title, content});
            const msg = {
                from    : {
                   name : 'Công cụ chống click tặc',
                   email: SendGridConfig.TO
                },
                to      : email,
                subject : title,
                text    : content,
                html    : `<bold><h1>${html.service}</h1></bold><br>Error content:<code>${JSON.stringify(html.error)}</code>`
            };

            sendGrid.send(msg, error => {
                if (error) {
                    logger.error('SendGrid/MailService::sendErrorMessage::error', error);
                    return reject(error);
                } else {
                    logger.info(`SendGrid/MailService::sendErrorMessage::success. Send mail to ${email} successfully`);
                    return resolve('Gửi thành công');
                }
            });
        } catch (e) {
            logger.error('SendGrid/MailService::sendErrorMessage::error::catch', e);
            return reject(e);
        }
    });
};

module.exports = {
    sendErrorMessage
}
