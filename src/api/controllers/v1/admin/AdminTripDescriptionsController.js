import BaseController from '../../BaseController';
import _ from 'underscore';
import TripDescription from '../../../models/TripDescription';
import SimpleRelationService from '../../../services/SimpleRelationService';
import moment from 'moment';
import Company from '../../../models/Company';
import Region from '../../../models/Region';
import Town from '../../../models/Town';
import Station from '../../../models/Station';
import camelize from 'camelize';



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

  async _import(rows = [], options = {}) {
    const companyName = rows[0]['Company'];
    const company = await Company.findOne({ name: companyName });
    const inCompleteTrips = [];
    const tripsWithUnExpectedDetails = [];

    if (company) {
      for (const trip of rows) {
        const arrivalRegionName = camelize(trip['Arrival Region']);
        const departureRegionName = camelize(trip['Departure Region']);
        const arrivalTownName = trip['Arrival town'];
        const departureTownName = trip['Departure town'];
        let arrivalStationName = camelize(trip['Arrival Station'].split('('))
        arrivalStationName = arrivalStationName.length > 1 ? arrivalStationName[1].replace(')', '').trim() : arrivalStationName[0];
        let departureStationName = camelize(trip['Departure station'].split('('));
        departureStationName = departureStationName.length > 1 ? departureStationName[1].replace(')', '').trim() : departureStationName[0];

        if (!arrivalRegionName || !departureRegionName || !arrivalTownName || !departureTownName || !arrivalStationName || !departureStationName) {
          console.log(`Some trip details are missing`);
          inCompleteTrips.push(trip);
        } else {
          const errors = [];
          let existingArrivalTown;
          let existingDepartureTown;
          let existingArrivalStation;
          let existingDepartureStation;

          const existingArrivalRegion = await Region.findOne({ name: arrivalRegionName });
          if (!existingArrivalRegion) {
            errors.push(`The region ${arrivalRegionName} does not exist`);
          } else {
            existingArrivalTown = await Town.findOne({ name: arrivalTownName, regionId: existingArrivalRegion.id })
            if (!existingArrivalTown) {
              errors.push(`The town ${arrivalTownName} of the region ${arrivalRegionName} does not exist`);
            } else {
              existingArrivalStation = await Station.findOne({ name: arrivalStationName, townId: existingArrivalTown.id });
              if (!existingArrivalStation) {
                errors.push(`The station ${arrivalStationName} in the town ${arrivalTownName} of the region ${arrivalRegionName} does not exist`);
              }
            }
          }

          const existingDepartureRegion = await Region.findOne({ name: departureRegionName });
          if (!existingDepartureRegion) {
            errors.push(`The region ${departureRegionName} does not exist`);
          } else {
            existingDepartureTown = await Town.findOne({ name: departureTownName, regionId: existingDepartureRegion.id });
            if (!existingDepartureTown) {
              errors.push(`The town ${departureTownName} of the region ${departureRegionName} does not exist`);
            } else {
              existingDepartureStation = await Station.findOne({ name: departureStationName, townId: existingDepartureTown.id });
              if (!existingDepartureStation) {
                errors.push(`The station ${departureStationName} in the town ${departureTownName} of the region ${departureRegionName} does not exist`);
              }
            }
          }

          if (errors.length > 0) {
            trip.errors = errors;
            tripsWithUnExpectedDetails.push(trip);
          } else {
            await TripDescription.findOrCreate({ 
              arrivalStationNameId: existingArrivalStation.id,
              departureStationNameId: existingDepartureStation.id,
              leavesAt: trip['Leaves at'],
              price: trip['Price'],
              day: trip['Day'],
              companyId: company.id
            });
            return { passed: true }
          }    
        }
      }
    } else {
      return {
        errors: [`The company ${companyName} does not exist`],
        passed: false,
      }
    }

    return {
      errors: [],
      inCompleteTrips,
      tripsWithUnExpectedDetails,
      passed: inCompleteTrips.length === 0 && tripsWithUnExpectedDetails.length === 0
    };
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
        trip_descriptions."companyId",
        trip_descriptions."fromStationId",
        trip_descriptions."toStationId",
        trip_descriptions."leavesAt",
        trip_descriptions."arrivesAt",
        trip_descriptions.day,
        companies.name as company,
        (select row_to_json("r*") 
            from (select stations.id, stations.name from stations where stations.id = trip_descriptions."fromStationId") as "r*") 
            as "fromStation",
        (select row_to_json("r*") 
          from (select stations.id, stations.name from stations where stations.id = trip_descriptions."toStationId") as "r*") 
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
  create: controller.create.bind(controller),
  import: controller.import.bind(controller)
};
