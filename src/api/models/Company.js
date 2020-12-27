import BaseModel from './BaseModel';

export default class Company extends BaseModel {
	static get tableName() {
		return 'companies';
	}

	static get primaryKeyName() {
		return 'id';
	}

	static get fieldNames() {
		return ['id', 'name', 'logo'];
	}

	static get textFields() {
		return ['name'];
	  }
}

