import Region from '../../../models/Region';
import BaseController from '../../BaseController';

class AdminRegionsController extends BaseController {
  tableName() {
    return Region.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.region_id.value;
  }

	_extraFilterParams(req) {
		const params = {
			countryCode: req.swagger.params.country_code.value,
		};

		return params;
	}
}

const controller = new AdminRegionsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
