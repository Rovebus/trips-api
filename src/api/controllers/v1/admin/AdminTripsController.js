import Trip from '../../../models/Trip';
import SimpleRelationService from '../../../services/SimpleRelationService';
import BaseController from '../../BaseController';
import _ from 'underscore';
import Station from '../../../models/Station';
import Company from '../../../models/Company';

class AdminTripsController extends BaseController {
  tableName() {
    return Trip.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.trip_id.value;
  }

	_extraFilterParams(req) {
		const params = {};

		if (req.swagger.params.from_town_id && req.swagger.params.from_town_id.value) {
		  params.fromTownId = req.swagger.params.from_town_id.value;
    }

		if (req.swagger.params.to_town_id && req.swagger.params.to_town_id.value) {
			params.toTownId = req.swagger.params.to_town_id.value;
		}

		return params;
	}

	static get defaultSortField() {
		return 'leavesAt';
	}

	static get defaultOrder() {
		return 'ASC';
	}

	_specialFilterParams(req) {
    const result = [];
		if (req.swagger.params.leaves_at && req.swagger.params.leaves_at.value) {
			result.push({ column: 'leavesAt', operator: '>=', value: req.swagger.params.leaves_at.value });
		}
		return result;
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

      const result = await model.filterAndCount(offset, limit, extraOptions);

      if (!result || result.items.length === 0) {
        response = await this._buildIndexResponse(req, offset, limit, result);
        this._updateResponseHeaders(req, res);
        this._respondByContentType(req.headers.accept, res, response);
      } else {

        let stationIds = [];
        for(const station of result.items) {
          stationIds.push(station.fromStationId);
          stationIds.push(station.toStationId);
        }

        stationIds = _.uniq(stationIds);
        stationIds = `'${stationIds.join(',').replace(/,/g, "','")}'`;

        let stations = await Station.connection.raw(`select stations.id, stations."name", countries.name as country_name,
          countries.code as country_code,
          regions.name as region_name,
          towns.name as town_name
          from stations 
          inner join towns on towns.id = stations."townId"
          inner join regions on regions.id = towns."regionId"
          inner join countries on countries.code = regions."countryCode"
          where stations.id in (${stationIds})
        `);

        const companies = await Company.table.whereIn('id', result.items.map(i => i.companyId));

        stations = stations.rows.map(station => {
          station.name = `${station.name}, ${station.town_name}, ${station.region_name}, ${station.country_name}`;
          return station;
        });


        result.items.forEach(item => {
          const station = stations.find(s => s.id === item.fromStationId);
          item.fromStation = station;
          item.toStation = station;
          item.company = companies.find(c => c.id === item.companyId);
        });



        response = await this._buildIndexResponse(req, offset, limit, result);
        this._updateResponseHeaders(req, res);
        this._respondByContentType(req.headers.accept, res, response);
      }
    } catch (err) {
      logger.error(err);
      res.status(400).json(this._errorMessage(`There is an error with ${model.name}`, 400, err));
    }

    return next();
  }
}

const controller = new AdminTripsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
  create: controller.create.bind(controller),
  AdminTripsController
};
