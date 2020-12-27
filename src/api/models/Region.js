import BaseModel from './BaseModel';

export default class Region extends BaseModel {
  static get tableName() {
    return 'regions';
  }

	static get primaryKeyName() {
		return 'id';
	}

  static get fieldNames() {
    return [
      'id',
      'name',
      'countryCode',
      'createdAt',
      'updatedAt',
    ];
  }

  static get textFields() {
    return ['name'];
  }
}

