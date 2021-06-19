import Station from '../../../models/Station';
import SimpleRelationService from '../../../services/SimpleRelationService';
import BaseController from '../../BaseController';

class AdminStationsController extends BaseController {
  tableName() {
    return Station.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.station_id.value;
  }

	_extraFilterParams(req) {
    const params = {};
    
    if (req.swagger.params.town_id && req.swagger.params.town_id.value) {
      params.townId = req.swagger.params.town_id.value;
    }

		return params;
	}
  async create(req, res, next) {
    
		const model = this.model();
	
		try {
		  const resource = this._bodyParams(req);
      resource.townId = req.swagger.params.town_id.value;
		  const result = await model.create(resource);
		  if (this.model().hasParent && result.parentId) {
			const condition = {};
			condition[this.model().primaryKeyName] = result.parentId;
			result.parent = await this.model().findOne(condition);
		  }
		  res.status(201).json(result);
		} catch (err) {
		  logger.error(err);
		  res
			.status(404)
			.json(this._errorMessage(`Could not create an object of type ${model.name}`, 404, err));
		}
		return next();
	}

  async index(req, res, next) {
    
    let response;
    let extraOptions = {};
    const model = this.model();

    try {
      const offset = req.swagger.params.offset.value;
      const limit = req.swagger.params.limit.value;
      extraOptions = this._attachSpecialParams(extraOptions, req);

      const extraParams = this._extraFilterParams(req);
      const relationsParams = new SimpleRelationService().getSimpleRelations(model, req, {});

      extraOptions.params = Object.assign(extraParams, relationsParams);
      extraOptions.functionQuery = this._multiIdParams(req);
      if (req.clientApp) {
        extraOptions.client = req.clientApp;
      }
      if (req.country) {
        extraOptions.country = req.country;
      }

      if (req.swagger.params.sort && req.swagger.params.sort.value) {
        extraOptions.sort = req.swagger.params.sort.value;
      }

      if (req.swagger.params.search && req.swagger.params.search.value) {
        extraOptions.search = req.swagger.params.search.value;
      }

      if (req.swagger.params.search_operator && req.swagger.params.search_operator.value) {
        extraOptions.searchOperator = req.swagger.params.search_operator.value;
      }

      if (req.swagger.params.search_fields && req.swagger.params.search_fields.value) {
        extraOptions.searchFields = req.swagger.params.search_fields.value;
      }

      extraOptions.specialParams = this._specialFilterParams(req);

      if (req.query.filters) {
        extraOptions.filters = JSON.parse(req.query.filters);
      }

      const result = await Station.connection.raw(`
        select stations.id, 
        stations."name",
        countries.name as country_name,
        countries.code as country_code,
        regions.name as region_name,
        towns.name as town_name
        from stations 
        inner join towns on towns.id = stations."townId"
        inner join regions on regions.id = towns."regionId"
        inner join countries on countries.code = regions."countryCode"
        ${
        extraOptions.search ? `where station.name ilike '%${extraOptions.search}%'` : ''
        }
        ${extraOptions.params.townId ? `and stations."townId" = '${extraOptions.params.townId}'` : ''}
        offset ${offset} limit ${limit}`
      );

      const stations = result.rows;

      response = await this._buildIndexResponse(req, offset, limit, { items: stations, count: stations.length });
      this._updateResponseHeaders(req, res);
      this._respondByContentType(req.headers.accept, res, response);
    } catch (err) {
      logger.error(err);
      res.status(400).json(this._errorMessage(`There is an error with ${model.name}`, 400, err));
    }

    return next();
  }
}

const controller = new AdminStationsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
