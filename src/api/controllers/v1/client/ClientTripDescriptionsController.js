import moment from 'moment';
import Station from '../../../models/Station';
import Trip from '../../../models/Trip';
import TripDescription from '../../../models/TripDescription';
import BaseController from '../../BaseController';

class ClientTripDescriptionsController extends BaseController {

  tableName() {
    return Trip.tableName;
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


  async index(req, res, next) {
    let response;

    try {
      const offset = req.swagger.params.offset.value;
      const limit = req.swagger.params.limit.value;
      const toTownId = req.swagger.params.to_town_id.value;
      const fromTownId = req.swagger.params.from_town_id.value;
      const date = req.swagger.params.leaves_at.value ? moment(req.swagger.params.date) : moment();
      const day = date.format('dddd');

      const toStations = await Station.table.where({ townId: toTownId });
      const fromStations = await Station.table.where({townId: fromTownId});

      const toStationIds = toStations.map(s => s.id);
      const fromStationIds = fromStations.map(s => s.id); //

      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ];
      const orderedDays = [];

      const dayIndex = days.indexOf(day);
      for (let m = dayIndex; m < days.length; m++) {
        orderedDays.push(days[m]);
      }

      if (dayIndex !== 0) {
        for (let m = 0; m < dayIndex; m++) {
          orderedDays.push(days[m]);
        }
      }

      let allResults = [];

      for (const orderedDay of orderedDays) {
        const result = await TripDescription.table
        .select(TripDescription.connection.raw(
          `distinct on (trip_descriptions.id)
          trip_descriptions.id,
          trip_descriptions."leavesAt",
          trip_descriptions."arrivesAt",
          trip_descriptions.price,
          trip_descriptions.days,
          trip_descriptions."companyId",
          (select row_to_json("r*") 
            from (select * from companies where companies.id = trip_descriptions."companyId") as "r*") 
            as company,
          (select row_to_json("r*") 
            from (select * from stations where stations.id = trip_descriptions."fromStationId") as "r*") 
            as "fromStation",
          (select row_to_json("r*") 
            from (select * from stations where stations.id = trip_descriptions."toStationId") as "r*") 
            as "toStation"
          `
        ))
        .whereIn('trip_descriptions.fromStationId', fromStationIds)
        .whereIn('trip_descriptions.toStationId', toStationIds)
        .innerJoin('stations', function() {
          this.on('stations.id', '=', 'trip_descriptions.fromStationId').orOn('stations.id', '=', 'trip_descriptions.toStationId')
        })
        .whereRaw(`'${orderedDay}'=ANY(trip_descriptions.days)`);
        result.forEach(item => { item.day = orderedDay; });
        allResults = allResults.concat(result);
      }
      
      response = await this._buildIndexResponse(req, offset, limit, { items: allResults, count: allResults.length});
      this._updateResponseHeaders(req, res);
      this._respondByContentType(req.headers.accept, res, response);
    } catch (err) {
      logger.error(err);
      res.status(400).json(this._errorMessage(`There is an error with ${this.tableName}`, 400, err));
    }

    return next();
  }
}

const controller = new ClientTripDescriptionsController();

module.exports = {
  index: controller.index.bind(controller),
  show: controller.show.bind(controller),
};
