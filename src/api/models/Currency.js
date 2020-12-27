import BaseModel from './BaseModel';

export default class Currency extends BaseModel {
  static get tableName() {
    return 'currencies';
  }

	static get primaryKeyName() {
		return 'id';
	}

  static get fieldNames() {
    return [
      'id',
      'name',
      'symbol'
    ];
  }

  static get textFields() {
    return ['name','symbol'];
  }
}

