import BaseModel from './BaseModel';

export default class Trip extends BaseModel {
  static get tableName() {
    return 'trips';
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
      'status',
      'companyId'
    ];
  }

  /*
  static get relations() {
    return [
      {
        tableName: 'devices',
        type: 'join',
        joinTye: 'inner',
        relations: [
          { tableName: 'projects', type: 'simple' },
        ],
      },

    ];
  }
  */
}
