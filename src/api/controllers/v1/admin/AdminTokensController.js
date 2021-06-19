import Token from '../../../models/Token';
import BaseController from '../../BaseController';

class AdminTokensController extends BaseController {
  tableName() {
    return Token.tableName;
  }

  _identifierValue(swagger) {
    return swagger.params.client_id.value;
  }
}

const controller = new AdminTokensController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
