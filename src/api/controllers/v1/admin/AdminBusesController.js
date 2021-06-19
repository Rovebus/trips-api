import Bus from '../../../models/Bus';
import BaseController from '../../BaseController';

class AdminBusesController extends BaseController {
  tableName() {
    return Bus.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.bus_id.value;
  }

  _prepareObjectForCreate(req, params) {
    const updatedParams = params;

    if (req.swagger.params.company_id && req.swagger.params.company_id.value) {
        updatedParams.companyId = req.swagger.params.company_id.value;
    }
    
    return updatedParams;
  }

  _extraFilterParams(req) {
    const params = {};

    if (req.swagger.params.company_id && req.swagger.params.company_id.value) {
        params.companyId = req.swagger.params.company_id.value;
    }

    return params;
}
}

const controller = new AdminBusesController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
