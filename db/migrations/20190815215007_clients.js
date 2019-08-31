exports.up = async (knex) => {
  await knex.schema.createTable('clients', (table) => {
    table.string('id');
    table.string('name').notNullable();
    table.string('description');
    table
      .timestamp('createdAt')
      .notNullable()
      .defaultTo(knex.raw('now()'));
    table
      .timestamp('updatedAt')
      .notNullable()
      .defaultTo(knex.raw('now()'));
    table.primary('id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('clients');
};
