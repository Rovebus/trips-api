exports.up = async (knex) => {
  await knex.schema.createTable('trips', (table) => {
    table
      .uuid('id')
      .notNullable()
      .primary();
    table.uuid('tripDescriptionId').notNullable();
    table.foreign('tripDescriptionId').references('trip_descriptions.id');
    table.uuid('busId').notNullable();
    table.foreign('busId').references('buses.id');
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
