import BaseModel from './BaseModel';

export default class Country extends BaseModel {
  static get tableName() {
    return 'countries';
  }

  static get primaryKeyName() {
    return 'code';
  }

  static get textFields() {
    return ['code', 'name'];
  }

  static get fieldNames() {
    return ['code', 'name'];
  }
}

