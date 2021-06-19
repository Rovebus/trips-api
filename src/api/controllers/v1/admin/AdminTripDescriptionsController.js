import BaseController from '../../BaseController';
import _ from 'underscore';
import TripDescription from '../../../models/TripDescription';
import SimpleRelationService from '../../../services/SimpleRelationService';
import moment from 'moment';



class AdminTripDescriptionsController extends BaseController {
  tableName() {
    return TripDescription.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.trip_description_id.value;
  }

  transformBodyBeforeCreate(params) {
    const updatedParams = params;
    updatedParams.leavesAt = moment(params.leavesAt).format("hh:mm:ss a");
    updatedParams.arrivesAt = moment(params.arrivesAt).format("hh:mm:ss a");
		return updatedParams;
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

      const result = await TripDescription.connection.raw(`
        select distinct on (trip_descriptions.id)
        trip_descriptions.id,
        trip_descriptions.price,
        trip_descriptions."leavesAt",
        trip_descriptions."arrivesAt",
        trip_descriptions.days,
        companies.name as company,
        (select row_to_json("r*") 
            from (select stations.id, stations.name from stations where stations.id = trip_descriptions."fromStationId") as "r*") 
            as "fromStation",
        (select row_to_json("r*") 
          from (select stations.name from stations where stations.id = trip_descriptions."toStationId") as "r*") 
          as "toStation"
        from trip_descriptions
        inner join companies on companies.id = trip_descriptions."companyId"
        inner join stations on stations.id = trip_descriptions."fromStationId" or stations.id = trip_descriptions."toStationId"
        ${
        extraOptions.search ? `where station.name ilike '%${extraOptions.search}%'` : ''
        }
        ${extraOptions.params.townId ? ` and stations."townId" = '${extraOptions.params.townId}'` : ''}
        offset ${offset} limit ${limit}`
      );

      const tripDescriptions = result.rows;

      response = await this._buildIndexResponse(req, offset, limit, { items: tripDescriptions, count: tripDescriptions.length });
      this._updateResponseHeaders(req, res);
      this._respondByContentType(req.headers.accept, res, response);
    } catch (err) {
      logger.error(err);
      res.status(400).json(this._errorMessage(`There is an error with ${model.name}`, 400, err));
    }

    return next();
  }
}

const controller = new AdminTripDescriptionsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
  create: controller.create.bind(controller)
};
