
exports.up = async (knex) => {
    await knex.schema.createTable('buses', (table) => {
      table
        .uuid('id')
        .notNullable()
        .primary();
      table.string('number').notNullable();
      table.integer('capacity');
      table.uuid('companyId');
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
    await knex.schema.dropTable('buses');
  };
  