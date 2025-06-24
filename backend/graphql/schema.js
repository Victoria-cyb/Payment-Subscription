const { makeExecutableSchema } = require('@graphql-tools/schema');

const typeDefs = (`
  type Transaction {
    id: ID!
    reference: String!
    amount: Float!
    status: String!
    type: String!
    interval: String
    planCode: String
    createdAt: String!
    address: String
    phone: String
    company: String
    houseAddress: String
    houseType: String
    cleaningOptions: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Job {
    id: ID!
    clientId: ID!
    transactionId: ID!
    location: Location!
    status: String!
    createdAt: String!
  }

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: String!
    location: Location
    subscription: Subscription
  }

  type Location {
    address: String!
    coordinates: Coordinates
  }

  type Coordinates {
    lat: Float
    lng: Float
  }

  type Subscription {
    planCode: String
    authorizationCode: String
    status: String
    nextPaymentDate: String
  }

  type InitializeTransactionResponse {
    accessCode: String!
    authorizationUrl: String!
    reference: String!
    status: String!
  }

  input UserInput {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
    role: String!
    location: LocationInput!
  }

  input LocationInput {
    address: String!
    coordinates: CoordinatesInput
  }

  input CoordinatesInput {
    lat: Float
    lng: Float
  }

  input PaymentInput {
    amount: Float!
    type: String!
    address: String
    phone: String
    company: String
  }

  input SubscriptionInput {
    amount: Float!
    type: String!
    interval: String!
    houseAddress: String
    houseType: String
    cleaningOptions: String
  }

  type Query {
    getUser: User
    getTransactions: [Transaction!]
    getTransactionByReference(reference: String!): Transaction
    matchCleaners(clientId: ID!): [User!]!
    getAvailableJobs: [Job!]!
  }

  type Mutation {
    signup(firstName: String!, lastName: String!, email: String!, password: String!, role: String!, location: LocationInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    initializePayment(input: PaymentInput!): InitializeTransactionResponse
    initializeSubscription(input: SubscriptionInput!): InitializeTransactionResponse
    verifyPaymentTransaction(reference: String!): Transaction
  }
`);

const resolvers = require('./resolvers');
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
module.exports = schema;