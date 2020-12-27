/* eslint-disable no-underscore-dangle, global-require, no-await-in-loop */
import pluralize from 'pluralize';
import capitalize from 'capitalize';
import camelize from 'camelize';
import moment from 'moment';
import UuidHelper from '../helpers/UuidHelper';

export default class BaseModel {
  constructor(rowItem) {
    Object.assign(this, rowItem);

    this.constructor.hasOne.forEach((HasOneClass) => {
      const relationName = HasOneClass.foreignKeyName.replace(
        capitalize(HasOneClass.primaryKeyName),
        '',
      );
      if (this._allKeysAreNull(this[relationName])) {
        delete this[relationName];
      } else {
        this._attachColumnRelationObject(HasOneClass, this[relationName]);
      }
    });

    this.constructor.manyToMany.forEach((relationConfig) => {
      if (
        this[relationConfig.entity.tableName] &&
        Array.isArray(this[relationConfig.entity.tableName])
      ) {
        this[relationConfig.entity.tableName] = this[relationConfig.entity.tableName].filter(
          (record) => !this._allKeysAreNull(record),
        );
      }
    });
  }

  /**
   * Returns name of table associated with a model
   */
  static get tableName() {
    throw new Error('All children must define tableName');
  }

  static get requestNamespace() {
    return require('cls-hooked').getNamespace('request');
  }

  static get fieldNames() {
    throw new Error('All children must define fieldNames');
  }

  static get fieldNamesWithTableName() {
    return this.fieldNames.map((name) => `${this.tableName}.${name}`);
  }

  static get rawFieldNamesWithTableName() {
    return this.fieldNamesWithTableName.map((fieldName) => `"${fieldName.split('.').join('"."')}"`);
  }

  static get table() {
    return this.connection(this.tableName);
  }

  /**
   * Fetches a single row from a table of a model
   * @param {object} conditions
   * @return {object}
   */
  static async findOne(conditions, extraOptions = {}, usedBuilder = false) {
    const {client} = extraOptions;
    const updatedCondition = usedBuilder ? conditions : {};

    if (!usedBuilder) {
      Object.keys(conditions).forEach((key) => {
        if (this.fieldNames.includes(key)) {
          updatedCondition[`${this.tableName}.${key}`] = conditions[key];
        }
      });
    }
    const query = this.table.select(this.fieldNamesWithTableName).where(updatedCondition);
    this._addSoftDeletionConditionIfNeeded(query);

    if (client) {
      this._addClientConditions(query);
    }

    this.addAllColumnRelations(query);

    this.manyToMany.forEach((relationConfig) => {
      this._addRelation(relationConfig, query);
    });

    if (this.fieldNames.includes(this.primaryKeyName)) {
      query.groupBy(`${this.tableName}.${this.primaryKeyName}`);
    }

    const row = await query.first();
    if (row) {
      return this.initializeModel(row);
    }
    return null;
  }

  static _addClientConditions(query) {
    return query;
  }

  /**
   * Returns the total number of rows of table in a model's table
   * @param {object} conditions
   * @return {integer}
   */
  static async count(conditions = {}) {
    const query = this.table.where(conditions);
    this._addSoftDeletionConditionIfNeeded(query);
    const result = await query.count();
    return parseInt(result[0].count, 10);
  }

  /**
   * Returns rows from model's table
   * @param {json} params
   * @param {integer} offset
   * @param {integer} limit
   * @return {json}
   */
  static async filter(offset, limit, options) {
    const {search, sort, params, client, functionQuery} = options;

    const query = this.table.select(this.fieldNamesWithTableName);

    if (params) {
      query.where(params);
    }

    if (client) {
      this._addClientConditions(query);
    }

    this._addSoftDeletionConditionIfNeeded(query);
    if (functionQuery) {
      query.where(functionQuery);
    }

    if (search) {
      this._addSearchQuery(query, search);
    }

    this.addAllColumnRelations(query);

    query.groupBy(`${this.tableName}.${this.primaryKeyName}`);

    query.orderByRaw(this.sortField(sort));

    query.limit(limit).offset(offset);

    return query.map((row) => this.initializeModel(row));
  }

  static get softDelete() {
    return false;
  }

  static _addSoftDeletionConditionIfNeeded(query) {
    if (this.softDelete) {
      query.andWhere(`${this.tableName}.deleted`, '=', false);
    }
  }

  /**
   * Returns rows from model's table and the full count of rows that match the criteria
   * @param {integer} offset
   * @param {integer} limit
   * @param options
   * @return {object}
   */
  static async filterAndCount(offset, limit, options) {
    const {
      params,
      primaryKeyIds,
      functionQuery,
      search,
      sort,
      specialParams,
      searchOperator,
      searchFields,
      filters,
    } = options;

    const query = this.table;

    if (params) {
      query.where(params);
    }

    this._addSoftDeletionConditionIfNeeded(query);
    if (functionQuery) {
      query.where(functionQuery);
    }

    /*
    if (search) {
      this._addSearchQuery(query, search);
    }
     */

    if (specialParams) {
      this._addSpecialConditions(query, specialParams);
    }

    query.select(this.fieldNamesWithTableName);

    if (primaryKeyIds && primaryKeyIds.length > 0) {
      query.whereIn(this.primaryKeyName, primaryKeyIds);
    }

    this.addAllColumnRelations(query);

    this.manyToMany.forEach((relationConfig) => {
      this._addRelation(relationConfig, query, params);
    });

    this.hasMany.forEach((relatedModel) => {
      this._addHasManyRelation(relatedModel, query);
    });

    if (Array.isArray(filters)) {
      filters.forEach((filter) => {
        query.where(
          `${filter.tablename}.id`,
          '=',
          `${filter.value}`,
        );
      })
    }

    /*
    this.hasOneToMany.forEach((model) => {
      this._addOneToManyColumnRelation(model, query);
    });
    */

    /*
    if (search) {
      // finalLimit = 10;
      this.textFields.forEach(textField => {
        query.orderByRaw(`SIMILARITY(${this.tableName}."${textField}", '${search}') DESC`)
      });
    } else {
      query.orderByRaw(this.sortField(sort));
    }
    */

    if (search) {
      this._addSearchQuery(query, search, searchOperator, searchFields);
    }

    query.orderByRaw(this.sortField(sort));

    query.groupBy(`${this.tableName}.${this.primaryKeyName}`);

    query.limit(limit).offset(offset);

    return this._runQueryWithCount(query);
  }

  static _addSpecialConditions(query, conditions) {
    conditions.forEach((condition) => {
      query.where(condition.column, condition.operator, condition.value);
    });
  }

  static async _runQueryWithCount(query) {
    // this column counts using window functions
    query.select(this.connection.raw('count(*) OVER() AS full_count'));
    let count = 0;
    const result = await query;
    const items = result.map((row) => {
      count = row.full_count;
      delete row.full_count;
      /*
      const updatedRow = await this.initializeModel(row);
      console.log(updatedRow);
      return updatedRow;
      */
      return new this(row);
    });
    return {items, count: parseInt(count, 10)};
  }

  static get textFields() {
    return ['name'];
  }

  static _addSearchQuery(query, search, searchOperator = 'like', searchFields = null) {
    // look for properties that are strings if no searchFields are sent
    const fields = searchFields || this.textFields;

    let value = search;
    if (searchOperator === 'like') {
      value = `%${search}%`;
    }
    let operator;
    switch (searchOperator) {
      case 'like':
        operator = 'ILIKE';
        break;
      case 'equals':
        operator = '=';
        break;
      default:
        operator = 'ILIKE';
        break;
    }

    query.andWhere((builder) =>
      fields.forEach((prop) => builder.orWhere(`${this.tableName}.${prop}`, operator, value)),
    );
  }

  static get textSearchFields() {
    return [];
  }

  static async initializeModel(row) {
    const record = new this(row);
    // eslint-disable-next-line no-restricted-syntax
    for (let m = 0; m < this.hasOne.length; m++) {
      const ForeignClass = this.hasOne[m];
      if (record[ForeignClass.foreignKeyName]) {
        const condition = {};
        condition[ForeignClass.primaryKeyName] = record[ForeignClass.foreignKeyName];
        record[ForeignClass.relationName] = await ForeignClass.findOne(condition);
      }
    }

    for (let m = 0; m < this.manyToMany.length; m++) {
      const manyToManyConfig = this.manyToMany[m];
      const condition = {};
      condition[this.foreignKeyName] = record[this.primaryKeyName];
      const manyToManyValues = await manyToManyConfig.through.fetchAll(condition);
      record[manyToManyConfig.entity.tableName] = await manyToManyConfig.entity.table.whereIn(
        manyToManyConfig.entity.primaryKeyName,
        manyToManyValues.map((val) => val[manyToManyConfig.entity.foreignKeyName]),
      );
    }
    return record;
  }

  static get defaultSortField() {
    return 'updatedAt';
  }

  static get defaultOrder() {
    return 'DESC';
  }

  static get primaryKeyName() {
    return 'id';
  }

  static get defaultSort() {
    return this._prependTableForSort(this.defaultSortField, this.defaultOrder);
  }

  static _prependTableForSort(field, order) {
    return `"${this.tableName}"."${field}" ${order}`;
  }

  static sortField(sort) {
    if (!sort) {
      return this.defaultSort;
    }

    let sortField = sort;
    let orderField = this.defaultOrder;
    if (sort.indexOf(':') > 0) {
      [sortField, orderField] = sort.split(':');
    }
    if (this.fieldNames.indexOf(sortField) < 0) {
      return this.defaultSort;
    }
    return this._prependTableForSort(sortField, orderField);
  }

  static delete(conditions) {
    return this.connection.transaction((trx) => this.deleteWithTrx(conditions, trx));
  }

  static async deleteWithTrx(conditions, trx) {
    let result;
    if (this.softDelete) {
      const items = await this.fetchAll(conditions);
      await Promise.all(
        items.map(async (anItem) => {
          const item = anItem;
          item.deleted = true;
          result = await item._saveWithTrx(trx);
          return result;
        }),
      );
    } else {
      result = await this.table
        .where(conditions)
        .del()
        .transacting(trx);
      if (result === 0) return null;
    }
    return result;
  }

  /**
   * Returns rows from model's table
   * @param {object} conditions
   * @param primaryKeyIds
   * @return {object}
   */
  static async fetchAll(conditions = {}, primaryKeyIds = []) {
    const query = this.table.where(conditions);
    this._addSoftDeletionConditionIfNeeded(query);
    if (primaryKeyIds.length > 0) {
      query.whereIn(this.primaryKeyName, primaryKeyIds);
    }

    if (this.softDelete) {
      const deleteParams = {};
      deleteParams[`${this.tableName}.deleted`] = false;
      query.where(deleteParams);
    }

    /*
    this.hasOneToMany.forEach((model) => {
      this._addOneToManyColumnRelation(model, query);
    });
    */

    const result = await query;
    for (let m = 0; m < result.length; m++) {
      // eslint-disable-next-line no-await-in-loop
      result[m] = await this.initializeModel(result[m]);
    }
    return result;
  }

  static get updateTimestampKey() {
    return 'updatedAt';
  }

  static get relations() {
    return [];
  }

  static get calculatedFieldNames() {
    return [];
  }

  static get foreignKeyName() {
    const singularForm = pluralize.singular(this.tableName);
    return `${singularForm}${capitalize(this.primaryKeyName)}`;
  }

  saveManyToManyRelations(trx) {
    this.constructor.manyToMany.forEach(async (relatedInfo) => {
      const relatedModelIdsFieldName = pluralize(relatedInfo.entity.foreignKeyName);
      if (this[relatedModelIdsFieldName]) {
        const conditions = {};
        conditions[this.constructor.foreignKeyName] = this.primaryKeyValue;
        const manyToManyFieldName = `_${camelize(relatedInfo.through.tableName)}`;
        this[manyToManyFieldName] = [];
        await relatedInfo.through.deleteWithTrx(conditions, trx);
        // eslint-disable-next-line no-restricted-syntax
        for (const relatedModelId of this[relatedModelIdsFieldName]) {
          const throughRecord = {};
          throughRecord[this.constructor.foreignKeyName] = this.primaryKeyValue;
          throughRecord[relatedInfo.entity.foreignKeyName] = relatedModelId;
          throughRecord.currentUserEmail = this.currentUserEmail;
          // eslint-disable-next-line no-await-in-loop
          const record = await relatedInfo.through.createWithTrx(throughRecord, trx);
          this[manyToManyFieldName].push(record);
        }
      }
    });
  }

  static get manyToMany() {
    // { entity: Model, through: JoinModel }
    return [];
  }

  static get hasMany() {
    return [];
  }

  static get hasOne() {
    return [];
  }

  static get hasOneToMany() {
    return [];
  }

  _allKeysAreNull(item) {
    if (typeof item === 'undefined' || item === null) {
      return true;
    }
    for (let m = 0; m < Object.keys(item).length; m++) {
      if (item[Object.keys(item)[m]] !== null) {
        return false;
      }
    }
    return true;
  }

  _attachColumnRelationObject(HasOneClass, relationObject) {
    const relationName = HasOneClass.foreignKeyName.replace(
      capitalize(HasOneClass.primaryKeyName),
      '',
    );
    this[relationName] = new HasOneClass(relationObject);
  }

  static addAllColumnRelations(query) {
    this.hasOne.forEach((relationClass) => this._addColumnRelation(relationClass, query));

    return query;
  }

  static isAlreadyJoinedWith(query, joinTable) {
    return query.toString().includes(joinTable);
  }

  static get hasParent() {
    return false;
  }

  static get relationName() {
    return camelize(pluralize.singular(this.tableName.replace('_', '')));
  }

  static _addColumnRelation(relationClass, query) {
    const {tableName, primaryKeyName, foreignKeyName} = relationClass;
    const relationName = foreignKeyName.replace(capitalize(primaryKeyName), '');

    const needsToJoin = !this.isAlreadyJoinedWith(query, tableName);
    if (needsToJoin) {
      query
        .leftOuterJoin(
          tableName,
          `${this.tableName}.${foreignKeyName}`,
          `${tableName}.${primaryKeyName}`,
        )
        .whereRaw(
          `(${tableName}.${primaryKeyName} = ${this.tableName}."${foreignKeyName}" OR ${this.tableName}."${foreignKeyName}" IS NULL)`,
        );
    }
    query.select(
      this.connection.raw(
        `row_to_json((SELECT "${relationName}" FROM (SELECT ${relationClass.rawFieldNamesWithTableName.join(
          ', ',
        )} ) "${relationName}" ) ) AS "${relationName}"`,
      ),
    );
    query.groupBy(`${tableName}.${primaryKeyName}`);
  }

  static _addOneToManyColumnRelation(relationClass, query) {
    const {tableName, primaryKeyName, foreignKeyName} = relationClass;
    const relationName = foreignKeyName.replace(capitalize(primaryKeyName), '');

    const needsToJoin = !this.isAlreadyJoinedWith(query, tableName);
    if (needsToJoin) {
      query
        .leftOuterJoin(
          tableName,
          `${this.tableName}.${primaryKeyName}`,
          `${tableName}."${this.foreignKeyName}"`,
        )
        .whereRaw(
          `(${tableName}."${this.foreignKeyName}" = ${this.tableName}."${primaryKeyName}")`,
        );
    }
    query.select(
      this.connection.raw(
        `json_agg(DISTINCT (SELECT ${relationName} FROM (SELECT ${relationClass.rawFieldNamesWithTableName.join(
          ', ',
        )} ) ${relationName} ) ) AS ${tableName}`,
      ),
    );
    query.groupBy(`${tableName}.${primaryKeyName}`);
  }

  static _addHasManyRelation(relatedModel, query) {
    const {tableName}  = relatedModel;

    const needsToJoin = !this.isAlreadyJoinedWith(query, tableName);
    if (needsToJoin) {
      query
          .leftOuterJoin(
              tableName,
              `${this.tableName}.${this.primaryKeyName}`,
              `${tableName}.${this.foreignKeyName}`,
          );
    }

    query.select(
        this.connection.raw(
            `json_agg(DISTINCT (SELECT ${tableName} FROM (SELECT ${relatedModel.rawFieldNamesWithTableName.join(
                ', ',
            )} ) ${tableName} ) ) AS ${tableName}`,
        ),
    );
  }

  static _addRelation(relationConfig, query, params, extraJoinQuery, includeField = true) {
    // relationConfig : entity as relationClass, through as throughClass
    const {tableName, primaryKeyName} = relationConfig.entity;
    const relationName = relationConfig.entity.relationName || pluralize.singular(tableName);
    const relationTableName = relationConfig.through.tableName;

    if (includeField) {
      query.select(
        this.connection.raw(
          `json_agg(DISTINCT (SELECT ${relationName} FROM (SELECT ${relationConfig.entity.rawFieldNamesWithTableName.join(
            ', ',
          )} ) ${relationName} ) ) AS ${tableName}`,
        ),
      );
    }

    const needsToJoin = !this.isAlreadyJoinedWith(query, relationTableName);
    if (needsToJoin) {
      query
        .leftOuterJoin(
          relationTableName,
          `${this.tableName}.${this.primaryKeyName}`,
          `${relationTableName}.${this.foreignKeyName}`,
        )
        .leftOuterJoin(tableName, (builder) => {
          builder.on(
            `${relationTableName}.${relationName}${capitalize(primaryKeyName)}`,
            '=',
            `${tableName}.${primaryKeyName}`,
          );
          if (relationConfig.entity.softDelete) {
            builder.andOn(`${tableName}.deleted`, '=', this.connection.raw('false'));
          }
          if (extraJoinQuery && Object.keys(extraJoinQuery).length > 0) {
            builder.andOn(extraJoinQuery);
          }
        });
    }
  }

  async _saveWithTrx(trx) {
    this[this.constructor.updateTimestampKey] = moment().toDate().getTime();
    const row = this.rowObject;
    if (this.constructor.softDelete) {
      row.deleted = this.deleted || false;
      this.deleted = this.deleted || false;
    }
    const result = await this.constructor.table
      .where(this.identifierParams)
      .update(row)
      .returning('*');
    if (result) {
      await this.saveManyToManyRelations(trx);
      // await this.track(trx);
      return this.constructor.initializeModel(this);
    }
    return false;
  }

  static get _generatePrimaryKeyValue() {
    return UuidHelper.newUuid;
  }

  /**
   * Inserts new row into a models table
   * @param {object} object
   * @param {object}trx
   */
  static async createWithTrx(object, trx) {
    const record = new this(object);
    if (this.primaryKeyName !== null && !record[this.primaryKeyName]) {
      record[this.primaryKeyName] = this._generatePrimaryKeyValue;
    }

    const result = await this.table.insert(record.rowObject).returning('*');
    // .transacting(trx);

    if (result) {
      // record = new this(result[0]);
      // record = await this.initializeModel(result[0]);
      record.currentUserEmail = this.requestNamespace ? this.requestNamespace.get('currentUserEmail') : 'machine@mystoreaid.com';

      await record.saveManyToManyRelations(trx, object);
      // await record.track(trx);
      // await record
      return this.initializeModel(record);
    }
    return null;
  }

  /**
   * Inserts new row into a models table
   * @param {object} object
   */
  static async create(object) {
    let record = null;
    await this.connection.transaction(async (trx) => {
      record = await this.createWithTrx(object, trx);
    });
    return record;
  }

  /**
   * Updates an existing model
   * @param {object} object of model
   * @param {string|int} primaryKeyValue
   */
  static async update(object, primaryKeyValue) {
    object.updatedAt = moment();
    const idCondition = {};
    idCondition[this.primaryKeyName] = primaryKeyValue;
    const currentObject = await this.findOne(idCondition);

    this.checkIfColumnsCanBeUpdated(object, currentObject);

    if (!currentObject) {
      throw new Error(`There is no row for ${idCondition}`);
    }

    this.transformBeforeCreateAndUpdate(object);
    if (!(await this.validateBeforeCreateAndUpdate(object))) {
      throw new Error('Object format is invalid. Check with API documentation');
    }

    Object.assign(currentObject, object);

    await currentObject.save();
    return this.initializeModel(currentObject);
  }

  static transformBeforeCreateAndUpdate() {}

  static async validateBeforeCreateAndUpdate() {
    return true;
  }

  /**
   * Empties table of a model
   * @return {integer} number of rows affected
   */
  static async deleteAll() {
    return this.table.del();
  }

  /**
   * Bulk insert with option to use existing transaction.
   * @param {Array} rows
   * @param {number} chunkSize
   * @returns {Promise<*>}
   */
  static async _bulkInsert(objects, chunkSize = 20) {
    let records = [];
    await this.connection.transaction(async (trx) => {
      records = await this._bulkInsertWithTrx(objects, chunkSize, trx);
    });
    return records;
  }

  /**
   * Inserts multiple number of rows into a table
   * @param {array} rows
   * @param {integer} chunkSize
   * @param {object}trx
   */
  static async _bulkInsertWithTrx(objects, chunkSize = 20, trx) {
    const rows = objects.map((row) => {
      row.createdAt = moment();
      row.updatedAt = moment();
      if (!row[this.primaryKeyName]) {
        row[this.primaryKeyName] = this._generatePrimaryKeyValue;
      }
      const record = new this(row);
      return record.rowObject;
    });

    const records = await this.connection
      .batchInsert(this.tableName, rows, chunkSize)
      .returning('*')
      .transacting(trx);

    return records.map((record) => new this(record));
  }

  /**
   * A list of columns that cannot be updated
   */
  static get permanentColumns() {
    return [];
  }

  static checkIfColumnsCanBeUpdated(updateParams, existingRow) {
    if (this.permanentColumns.length > 0) {
      const paramKeys = Object.keys(updateParams);
      for (let i = 0; i < paramKeys.length; i++) {
        const fieldName = paramKeys[i];
        if (this.permanentColumns.includes(fieldName)) {
          if (updateParams[fieldName] !== existingRow[fieldName]) {
            throw new Error(`The field ${fieldName} cannot be updated. It is a permanent field`);
          }
        }
      }
    }
  }

  static _includeJoinFilter(query, callerJoins) {
    let results = query;

    // handle wrong project id
    if (this.relations) {
      const relations = this.relations.filter((foreignTable) => foreignTable.type === 'join');
      relations.forEach((foreignTable) => {
        const foreign = callerJoins[foreignTable.tableName];
        results = results
          .innerJoin(
            foreign.relationTable,
            `${foreign.relationTable}.${foreign.foreignKey}`,
            `${this.tableName}.${this.primaryKey}`,
          )
          .where(
            `${foreign.relationTable}.${foreign.otherTableForeignKey}`,
            foreign.otherTableKeyValue,
          );
      });
    }
    return results;
  }

  static identifierName() {
    return 'id';
  }

  get rowObject() {
    const result = {};
    // @todo, get field names from swagger
    this.constructor.fieldNames.concat(['createdAt', 'updatedAt']).forEach((name) => {
      result[name] = this[name];
    });

    if (this.constructor.softDelete) {
      result.deleted = this.deleted;
    }

    return result;
  }

  static get columnRelations() {
    return [];
  }

  static addColumnRelations(query) {
    let result = query;

    this.columnRelations.forEach((relationClass) => {
      const relationTableName = relationClass.tableName;

      let {relationName} = relationClass;
      relationName = !relationName ? pluralize.singular(relationTableName) : relationName;

      result = result.select(
        this.connection.raw(
          `row_to_json((SELECT ${relationName} FROM (SELECT ${relationClass.rawFieldNamesWithTableName.join(
            ', ',
          )} ) ${relationName} ) ) AS ${relationName}`,
        ),
      );
      result = result
        .leftOuterJoin(
          relationTableName,
          `${this.tableName}.${relationName}${capitalize(relationClass.primaryKeyName)}`,
          `${relationTableName}.${relationClass.primaryKeyName}`,
        )
        .whereRaw(
          `(${relationTableName}.${relationClass.primaryKeyName} = ${
            this.tableName
          }."${relationName}${capitalize(relationClass.primaryKeyName)}")`,
        )
        .groupBy(`${relationTableName}.${relationClass.primaryKeyName}`);
    });

    return result;
  }

  static async closeConnection() {
    await this.connection.destroy();
  }

  static get connection() {
    /* eslint-disable global-require */
    return require('../../../db/knex').connection;
  }

  get identifierParams() {
    const result = {};
    result[this.constructor.primaryKeyName] = this.primaryKeyValue;
    return result;
  }

  static get primaryKey() {
    return 'id';
  }

  get primaryKeyValue() {
    return this[this.constructor.primaryKeyName];
  }

  save() {
    return this.constructor.connection.transaction((trx) => this._saveWithTrx(trx));
  }
}
