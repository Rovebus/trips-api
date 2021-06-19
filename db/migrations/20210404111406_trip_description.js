exports.up = async (knex) => {
    await knex.schema.createTable('trip_descriptions', (table) => {
      table
        .uuid('id')
        .notNullable()
        .primary();
      table.uuid('fromStationId').notNullable();
      table.foreign('fromStationId').references('stations.id');
      table.uuid('toStationId').notNullable();
      table.foreign('toStationId').references('stations.id');
      table.string('leavesAt').notNullable();
      table.string('arrivesAt').notNullable();
      table.decimal('price').notNullable();
      table.uuid('companyId').notNullable();
      table.foreign('companyId').references('companies.id');
      table.specificType('days', 'text[]')
      table
        .timestamp('createdAt')
        .notNullable()
        .defaultTo(knex.raw('now()'));
      table
        .timestamp('updatedAt')
        .notNullable()
        .defaultTo(knex.raw('now()'));
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.dropTable('trip_descriptions');
  };
  