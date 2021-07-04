exports.up = async (knex) => {
    await knex.schema.alterTable('trip_descriptions', (table) => {
        table.enu('day', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.alterTable('trip_descriptions', (table) => {
      table.dropColumn('day');
    });
  };
  