const requireAll = require('require-all');

module.exports = requireAll(
    {
        dirname: __dirname,
        filter: /(.+Model)\.js$/,
        resolve: function (Model) {
            return Model;
        }
    }
);