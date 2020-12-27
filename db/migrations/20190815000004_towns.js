
exports.up = async (knex) => {
  await knex.schema.createTable('towns', (table) => {
    table
      .uuid('id')
      .notNullable()
      .primary();
    table.string('name').notNullable();
    table.uuid('regionId');
    table.foreign('regionId').references('regions.id');
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
