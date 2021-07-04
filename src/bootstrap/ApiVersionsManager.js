import Token from '../api/models/Token';
import Client from '../api/models/Client';
import UserHelper from '../api/helpers/UserHelper';
const SwaggerParser = require('swagger-parser');
const SwaggerExpress = require('swagger-express-mw');
const versions = require('../../config/versions.json');
const swaggerUi = require('swagger-ui-express');
const jwtValidator = require('../api/middlewares/jwtValidator');
const apiName = require('../../package.json').name;


export default class ApiVersionsManager {

    constructor(server){
        this.server = server;
    }

    async setupApiVersion(versionNumber) {
        const api = await SwaggerParser.dereference(`${__dirname}/../../swagger/swagger_v${versionNumber}.yaml`);

        api.host = _config.host;
        _config.basePath = api.basePath;
        const adminMiddlewares = [jwtValidator];
        const clientMiddlewares = [];

        const baseSwaggerConfig = {
            appRoot: '../',
            swagger: api,
            swaggerSecurityHandlers: {
                rovebusKey: async (req, res, next) => {
                    const clientName = req.headers['x-rovebus-client'];
                    const hash = req.headers['x-rovebus-hash'];
            
                    const client = await Client.findOne({name: clientName});
                    const token = await Token.findOne({clientName: client.name});
            
                    if (client.name === token.clientName && hash === token.token) {
                        req.client = client;
                        return next();
                    }
                    res.send({
                        code: 401,
                        message: 'You are not authorized',
                    });
                    res.end();
                    return null;
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
                }
            }
        };

        const controllerDirs = [`${__dirname}/../api/controllers/v${versionNumber}/client`, `${__dirname}/../api/controllers/v${versionNumber}/admin`];
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
                    {onError: 'json_error_handler'},
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
        .filter((pathName) => !swaggerViewApi.paths[pathName]['x-hidden'])
        .reduce((res, key) => Object.assign(res, {[key]: swaggerViewApi.paths[key]}), {});

        this.server.use(`${api.basePath}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerViewApi));

        SwaggerExpress.create(swaggerConfig, (err, swaggerExpress) => {
            if (err) {
                throw err;
            }

            swaggerExpress.register(this.server);

            if (swaggerExpress.runner.swagger.paths['/companies']) {
                console.info(`try this:\ncurl http://${api.host}${api.basePath}/companies`);
            }
        });
    }
    async setupVersions() {
        for (const version of versions) {
            await this.setupApiVersion(version);
        }
    }
}
