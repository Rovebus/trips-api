import capitalize from 'capitalize';
import Country from '../../../models/Country';
import Region from '../../../models/Region';
import BaseController from '../../BaseController';
import _ from 'underscore';
import Town from '../../../models/Town';

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

  async _import(rows, options = {}) {
    const { countryId } = options;
    const inCompleteRows = [];

    for (const row of rows) {
      const errors = []; 
      let region;
      let town;
      let station;

      if (row['Region'] && row['Region'].length > 0) {
        region = await Region.findOrCreate({ name: capitalize(row['Region']), countryId });
        if (region) {
          if (row['Town'] && row['Town'].length > 0) {
            town = await Town.findOrCreate({ name: capitalize(row['Town']), regionId: region.id });
            if (row['Station'] && row['Station'].length > 0) {
              station = await Station.findOrCreate({ name: capitalize(row['Station']), townId: town.id })
            }
          } else {
            errors.push(`Town is not stated`);
          }
        } else {
          errors.push(`Failed to create region ${row['Region']}`);
        }
      } else {
        errors.push(`Region is not stated`);
      }

      if (errors.length > 0) {
        row.errors = errors;
        inCompleteRows.push(row);
      }
    }

    return {
      passed: inCompleteRows.length === 0,
      inCompleteRows
    }
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
