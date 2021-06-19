import BaseModel from './BaseModel';

export default class Bus extends BaseModel {
  static get tableName() {
    return 'buses';
  }

  static get primaryKeyName() {
    return 'id';
  }

  static get fieldNames() {
    return ['id', 'number', 'capacity', 'companyId', 'createdAt', 'updatedAt'];
  }

  static get textFields() {
    return ['number'];
  }
}

