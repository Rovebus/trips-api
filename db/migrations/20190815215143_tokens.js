exports.up = async (knex) => {
  await knex.schema.createTable('tokens', (table) => {
    table.uuid('clientId').notNullable();
    table.foreign('clientId').references('clients.id');
    table.string('token', 24).notNullable();
    table.primary('clientId');
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
  await knex.schema.dropTable('tokens');
};
