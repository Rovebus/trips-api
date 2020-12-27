import BaseModel from './BaseModel';

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
}

