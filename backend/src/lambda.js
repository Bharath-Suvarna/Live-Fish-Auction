/**
 * Serverless Lambda Adapter (using serverless-http)
 * Wraps Express REST API for execution inside AWS Lambda.
 */
const serverless = require('serverless-http');
const { app } = require('./server');

module.exports.handler = serverless(app);
