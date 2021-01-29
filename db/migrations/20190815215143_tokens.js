exports.up = async (knex) => {
  await knex.schema.createTable('tokens', (table) => {
    table.string('clientName').notNullable();
    table.foreign('clientName').references('clients.name');
    table.string('token', 24).notNullable();
    table.primary('clientName');
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
