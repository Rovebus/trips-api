import Currency from '../../../models/Currency';
import BaseController from '../../BaseController';

class AdminCurrenciesController extends BaseController {
	tableName() {
		return Currency.tableName;
	}

	_identifierValue(swagger) {
		return swagger.params.currency_id.value;
	}
}

const controller = new AdminCurrenciesController();

module.exports = {
	show: controller.show.bind(controller),
	index: controller.index.bind(controller),
	update: controller.update.bind(controller),
	destroy: controller.destroy.bind(controller),
	create: controller.create.bind(controller),
};
