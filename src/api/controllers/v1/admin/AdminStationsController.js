import BaseController from '../../BaseController';

class AdminStationsController extends BaseController {
  tableName() {
    return 'stations';
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
}

const controller = new AdminStationsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
