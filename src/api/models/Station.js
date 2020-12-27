import BaseModel from './BaseModel';

export default class Station extends BaseModel {
  static get tableName() {
    return 'stations';
  }

	static get primaryKeyName() {
		return 'id';
	}

  static get fieldNames() {
    return [
      'id',
      'name',
      'townId',
      'stationGps',
      'createdAt',
      'updatedAt',
    ];
  }

  static get textFields() {
    return ['name'];
  }
}

