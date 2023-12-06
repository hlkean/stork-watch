const { gql } = require('apollo-server-micro');

const typeDefs = gql`
  type User {
    id: ID!
    first_name: String!
    last_name: String!
    phone_numner: String!
    type: String!
  }

  type Query {
    getUser(id: ID!): User
    getAllUsers: [User!]!
  }

  type Mutation {
    createUser(first_name: String!, last_name: String!, phone_number: String!, type: String!): User!
    updateUser(first_name: String!, last_name: String!, phone_number: String!, type: String!): User!
    deleteUser(id: ID!): User!
  }
`;

module.exports = typeDefs;