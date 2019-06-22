const mongoose = require('mongoose');
const models = require('./models');
const AccountModel = models['AccountModel'];
const PostModel = models['PostModel'];

const updateAccountOwnerObjectId = () => {
    AccountModel.find({})
        .exec((err, accounts) => {
            if (err) {
                console.error(err);
                return;
            }

            accounts.forEach((a) => {
                a.save((err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('success');
                    }
                });
            });
        });
};

const updatePostContentId = () => {
    PostModel.find({})
        .exec((err, posts) => {
            if (err) {
                console.error(err);
                return;
            }

            posts.forEach((p) => {
                p.content_id = p.contentId;
                p.save((err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('success');
                    }
                });
            });
        });
};

module.exports = () => {
    // updateAccountOwnerObjectId();
    // updatePostContentId();
};
