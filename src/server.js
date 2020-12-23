/* global appEmitter */
/* eslint-disable no-await-in-loop, no-restricted-syntax */

import bunyan from 'bunyan';
import consign from 'consign';
import UserHelper from './api/helpers/UserHelper';

require('./bootstrap/init.js');
const SwaggerExpress = require('swagger-express-mw');
const SwaggerParser = require('swagger-parser');
const server = require('express')();
const swaggerUi = require('swagger-ui-express');
const protect = require('@risingstack/protect');
const bodyParser = require('body-parser');
// const { auth } = require('./api/Authentication');
const compression = require('compression');

const ClientAuthentication = require('./ClientAuthentication');

const apiName = require('../package').name;
const knex = require('../db/knex');

const requestNamespace = require('cls-hooked').createNamespace('request');

const jwtValidator = require('./api/middlewares/jwtValidator');

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

  // global.errors = errors;

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

  const api = await SwaggerParser.dereference(`${__dirname}/../swagger/swagger_v1.yaml`);

  api.host = _config.host;
  _config.basePath = api.basePath;

  const adminMiddlewares = [jwtValidator];
  const clientMiddlewares = [];

  const baseSwaggerConfig = {
    appRoot: __dirname,
    swagger: api,
    swaggerSecurityHandlers: {
			rovebusKey: async (req, res, next) => {
        const authenticated = await ClientAuthentication.auth.authenticate(req, next);
        if (authenticated) {
          for (const middleware of clientMiddlewares) {
            await middleware(req, res);
          }
          return next();
        }
        return false;
      },
      adminAuth: async (req, res, next) => {
        try {
          UserHelper.attachUserToRequest(req, res, next, _config.auth0.namespace);
        } catch (err) {
          console.error('error on attachUserToRequest');
          console.error(err);
        }

        if (req.user) {
          for (const middleware of adminMiddlewares) {
            await middleware(req, res);
          }

          await UserHelper.validatePermissions(req, res, next, apiName);
        } else if (!res.headersSent) {
          res.status(401).send({
            code: 401,
            error: 'Unauthorized',
            message: 'You do need to login',
          });
        }
      },
    },
  };

  const controllerDirs = [
    'api/controllers/v1/admin',
		'api/controllers/v1/client',
  ];

  const swaggerConfig = Object.assign(
    {
      bagpipes: {
        _router: {
          name: 'swagger_router',
          mockMode: false,
          mockControllersDirs: [],
          controllersDirs: controllerDirs,
        },
        _swagger_validate: {
          name: 'swagger_validator',
          validateReponse: true,
        },
        swagger_controllers: [
          { onError: 'json_error_handler' },
          'cors',
          'swagger_params_parser',
          'swagger_security',
          '_swagger_validate',
          'express_compatibility',
          '_router',
        ],
      },
      swaggerControllerPipe: 'swagger_controllers',
      fittingsDirs: ['swagger/fittings'],
      defaultPipe: null,
    },
    baseSwaggerConfig,
  );

  const swaggerViewApi = Object.assign({}, api);
  swaggerViewApi.paths = Object.keys(swaggerViewApi.paths)
    .filter(path => !swaggerViewApi.paths[path]['x-hidden'])
    .reduce((res, key) => Object.assign(res, { [key]: swaggerViewApi.paths[key] }), {});

  server.use(`${api.basePath}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerViewApi));

  server.use((req, res, next) => {
    requestNamespace.run(() => {
      requestNamespace.set('Clear-Cache', req.get('Clear-Cache'));
      next();
    });
  });

  SwaggerExpress.create(swaggerConfig, (err, swaggerExpress) => {
    if (err) {
      throw err;
    }

    swaggerExpress.register(server);

    server.listen(port);

    if (swaggerExpress.runner.swagger.paths['/trips']) {
      console.info(`try this:\ncurl http://${api.host}${api.basePath}/trips`);
    }
  });

  return server;
}

module.exports = start();
