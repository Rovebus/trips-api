exports.up = async (knex) => {
  await knex.schema.createTable('clients', (table) => {
    table.string('name').notNullable().primary();
    table.string('description');
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
  await knex.schema.dropTable('clients');
};
