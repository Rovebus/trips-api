import BaseModel from './BaseModel';

export default class Token extends BaseModel {
  static get tableName() {
    return 'tokens';
  }

  static get fieldNames() {
    return ['clientName', 'token'];
  }

	static get primaryKeyName() {
		return 'clientName';
	}
  /*
  static get fieldNames() {
    throw new Error('Forbidden!');
  }
  */
}

