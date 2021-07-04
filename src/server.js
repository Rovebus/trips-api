/* global appEmitter */
/* eslint-disable no-await-in-loop, no-restricted-syntax */

import bunyan from 'bunyan';
import consign from 'consign';
import ApiVersionsManager from './bootstrap/ApiVersionsManager';

require('./bootstrap/init.js');
const SwaggerExpress = require('swagger-express-mw');
const SwaggerParser = require('swagger-parser');
const server = require('express')();
const swaggerUi = require('swagger-ui-express');
const protect = require('@risingstack/protect');
const bodyParser = require('body-parser');
const compression = require('compression');
const requestNamespace = require('cls-hooked').createNamespace('request');
const knex = require('../db/knex');


async function start() {
  await knex.initializeConnection();

  server.use(bodyParser.json({
    extended: false,
  }));

  /* Do not allow request with sql injection to proceed to next middleware */
  server.use(protect.express.sqlInjection({
    body: true,
    loggerFunction: console.error,
  }));

  server.use(compression({ threshold: 0 }));

  const bunyanLogger = bunyan.createLogger({
    name: 'appLogger',
    serializers: {
      err: bunyan.stdSerializers.err,
    },
  });

  const port = process.env.PORT || '8081';

  consign()
    .include('./bootstrap/init.js')
    .into(server);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('port is currently in use');
    }
  });

  server.on('uncaughtException', (req, res, err, appError) => {
    bunyanLogger.info(appError);

    return res.send(new Error(appError.message));
  });

  appEmitter.on('init:done', () => {
    console.info('App initialization done!');
  });

  server.use((req, res, next) => {
    requestNamespace.run(() => {
      requestNamespace.set('Clear-Cache', req.get('Clear-Cache'));
      next();
    });
  });

  

  await new ApiVersionsManager(server).setupVersions();

  server.listen(port);

  return server;
}

module.exports = start();
