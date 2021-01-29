import Country from '../../../models/Country';
import SimpleRelationService from '../../../services/SimpleRelationService';
import BaseController from '../../BaseController';

class ClientTownsController extends BaseController {
  tableName() {
    return 'towns';
  }

  _identifierValue(swagger) {
    return swagger.params.trip_id.value;
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

      if (this.model().hasParent) {
        for (let m = 0; m < result.items.length; m++) {
          const item = result.items[m];
          const condition = {};
          condition[this.model().primaryKeyName] = item.parentId;
          // eslint-disable-next-line no-await-in-loop
          item.parent = await this.model().findOne(condition);
        }
	  }
	  
	  const countries = await Country.fetchAll();

	  result.items.forEach(item => {
		  item.country = countries.find(c => c.code === item.region.countryCode);
	  });

      response = await this._buildIndexResponse(req, offset, limit, result);
      this._updateResponseHeaders(req, res);
      this._respondByContentType(req.headers.accept, res, response);
    } catch (err) {
      logger.error(err);
      res.status(400).json(this._errorMessage(`There is an error with ${model.name}`, 400, err));
    }

    return next();
  }
}

const controller = new ClientTownsController();

module.exports = {
  show: controller.show.bind(controller),
  index: controller.index.bind(controller),
  update: controller.update.bind(controller),
  destroy: controller.destroy.bind(controller),
  create: controller.create.bind(controller),
};
