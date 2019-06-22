#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var http = require('http');
var db = require('../database/db');
var log4js = require('log4js');
log4js.configure('./config/log4js.json');
const config = require('config');
var ScriptController = require('../controller/user/ScriptController');

/**
 * Get port from environment and store in Express.
 */

var port = 9000;
app.set('port', port);

var server = http.createServer(app);
/**
 * Listen on provided port, on all network interfaces.
 */
server.on('listening', onListening);

db(() => {
    
    console.log('Connect to mongodb successfully');
    server.listen(port);
    
    ScriptController.generateUrl2();
});

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    console.log('Server is running on port ', port);
}
