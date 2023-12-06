const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stork_watch',
  port: 5432
});

const resolvers = {
  Query: {
    getUser: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return rows[0];
    },
    getAllUsers: async () => {
      const { rows } = await pool.query('SELECT * FROM users');
      return rows;
    }
  },
  Mutation: {
    createUser: async (_, { name, email, password }) => {
      const { rows } = await pool.query('INSERT INTO users (first_name, last_name, phone_number, type) VALUES ($1, $2, $3) RETURNING *', [first_name, last_name, phone_number, type]);
      return rows[0];
    },
    updateUser: async (_, { id, name, email, password }) => {
      // Add logic to handle individual fields
      const { rows } = await pool.query('UPDATE users SET first_name = $1, last_name = $2, phone_number = $3, type = $3 WHERE id = $4 RETURNING *', [first_name, last_name, phone_number, type, id]);
      return rows[0];
    },
    deleteUser: async (_, { id }) => {
      const { rows } = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
      return rows[0];
    }
  }
};

module.exports = resolvers;