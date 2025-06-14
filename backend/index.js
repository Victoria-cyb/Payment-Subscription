const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

console.log('Environment variables:', {
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Undefined',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? 'Set' : 'Undefined',
  FRONTEND_URL: process.env.FRONTEND_URL || 'Undefined',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Undefined',
});

const express = require('express');
const http = require('http');
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const connectDB = require('./config/db');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');
const Transaction = require('./models/Transaction');
const { User } = require('./models/User');
const { Job } = require('./models/Jobs');

const app = express();
const httpServer = http.createServer(app);

connectDB();

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
  formatError: (err) => {
    console.error('GraphQL Error:', err.message);
    return err;
  },
});

(async () => {
  await server.start();

  app.use(cors());
  app.use(bodyParser.json());

  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({ req }),
  }));

  app.post('/webhook', async (req, res) => {
    try {
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Invalid signature');
      }

      const event = req.body;
      if (event.event === 'charge.success') {
        const { reference } = event.data;
        const transaction = await Transaction.findOne({ reference });

        if (transaction) {
          transaction.status = 'success';
          await transaction.save();

          if (transaction.type === 'subscription') {
            const user = await User.findById(transaction.userId);
            user.subscription = {
              planCode: event.data.plan?.plan_code,
              authorizationCode: event.data.authorization.authorization_code,
              status: 'active',
              nextPaymentDate: new Date(event.data.next_payment_date),
            };
            await user.save();
          }
        }
      }

      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('Webhook error:', error.message);
      res.status(500).send('Webhook processing failed');
    }
  });

  

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`GraphQL endpoint at http://localhost:${PORT}/graphql`);
  });
})();