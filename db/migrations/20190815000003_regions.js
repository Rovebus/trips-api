exports.up = async (knex) => {
  await knex.schema.createTable('regions', (table) => {
    table
      .uuid('id')
      .notNullable()
      .primary();
    table.string('name').notNullable();
    table.string('countryCode').notNullable();
    table.foreign('countryCode').references('countries.code');
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
  await knex.schema.dropTable('regions');
};
