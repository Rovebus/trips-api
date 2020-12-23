exports.up = async (knex) => {
  await knex.schema.createTable('trips', (table) => {
    table
      .uuid('id')
      .notNullable()
      .primary();
    table.uuid('fromStationId').notNullable();
    table.foreign('fromStationId').references('stations.id');
    table.uuid('toStationId').notNullable();
    table.foreign('toStationId').references('stations.id');
    table.uuid('fromTownId').notNullable();
    table.foreign('fromTownId').references('towns.id');
    table.uuid('toTownId').notNullable();
    table.foreign('toTownId').references('towns.id');
    table.timestamp('leavesAt').notNullable();
    table.timestamp('arrivesAt').notNullable();
    table.decimal('price').notNullable();
    table.string('status').notNullable();
    table.uuid('companyId').notNullable();
    table.foreign('companyId').references('companies.id');
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
  await knex.schema.dropTable('trips');
};
