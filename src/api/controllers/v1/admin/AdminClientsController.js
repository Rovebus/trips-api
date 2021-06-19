import { Client } from 'pg';
import BaseController from '../../BaseController';

class AdminClientsController extends BaseController {
  tableName() {
    return Client.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.client_id.value;
  }
}

const controller = new AdminClientsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
