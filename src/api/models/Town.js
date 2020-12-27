import BaseModel from './BaseModel';
import Region from './Region';

export default class Town extends BaseModel {
  static get tableName() {
    return 'towns';
  }

	static get primaryKeyName() {
		return 'id';
	}

  static get fieldNames() {
    return [
      'id',
      'name',
      'regionId',
      'createdAt',
      'updatedAt',
    ];
  }

  static get textFields() {
    return ['name'];
  }

  static get hasOne() {
    return [Region];
  }
}

