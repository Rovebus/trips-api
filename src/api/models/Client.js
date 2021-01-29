import BaseModel from './BaseModel';

export default class Client extends BaseModel {
  static get tableName() {
    return 'clients';
  }

	static get primaryKeyName() {
		return 'name';
	}

  static get fieldNames() {
    return ['name', 'description'];
  }
}

