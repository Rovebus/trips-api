import BaseModel from './BaseModel';

export default class TripDescription extends BaseModel {
  static get tableName() {
    return 'trip_descriptions';
  }

	static get primaryKeyName() {
		return 'id';
	}

  static get fieldNames() {
    return [
      'id',
      'fromStationId',
      'toStationId',
      'leavesAt',
      'arrivesAt',
      'price',
      'days',
      'companyId',
      'createdAt',
      'updatedAt',
    ];
  }
}
