import Town from '../../../models/Town';
import BaseController from '../../BaseController';

class AdminTownsController extends BaseController {
  tableName() {
    return Town.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.town_id.value;
  }

	_extraFilterParams(req) {
		const params = {
      regionId: req.swagger.params.region_id.value,
		};

		return params;
	}

  _prepareObjectForCreate(req, params) {
    const updatedParams = params;

    if (req.swagger.params.region_id && req.swagger.params.region_id.value) {
        updatedParams.regionId = req.swagger.params.region_id.value;
    }
    
    return updatedParams;
  }
}

const controller = new AdminTownsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
	AdminTownsController
};
