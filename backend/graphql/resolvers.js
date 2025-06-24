const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Job = require('../models/Jobs');
const paystack = require('../utils/paystack');
const authMiddleware = require('../middleware/auth');
const { sendPaymentNotification } = require('../utils/email');

// Haversine formula to calculate distance between two coordinates
function haversineDistance(coord1, coord2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371; // Earth's radius
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

module.exports = {
  Query: {
    getUser: async (_, __, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('getUser: Fetching user:', userId);
        const user = await User.findById(userId);
        console.log('getUser: User:', user);
        if (!user) throw new Error('User not found');
        return user;
      } catch (error) {
        console.error('getUser: Error:', error.message);
        throw new Error(`Failed to fetch user: ${error.message}`);
      }
    },
    getTransactions: async (_, __, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('getTransactions: Fetching for user:', userId);
        const transactions = await Transaction.find({ userId });
        const transformedTransactions = transactions.map(tx => {
          const txObject = tx.toObject();
          if (!txObject._id) {
            console.error('getTransactions: Missing _id for transaction:', txObject);
            return null;
          }
          return {
            id: txObject._id.toString(),
            reference: txObject.reference,
            amount: txObject.amount,
            status: txObject.status,
            type: txObject.type,
            interval: txObject.interval,
            planCode: txObject.planCode,
            createdAt: txObject.createdAt instanceof Date ? txObject.createdAt.toISOString() : txObject.createdAt,
            address: txObject.address,
            phone: txObject.phone,
            company: txObject.company,
            houseAddress: txObject.houseAddress,
            houseType: txObject.houseType,
            cleaningOptions: txObject.cleaningOptions,
          };
        }).filter(tx => tx !== null);
        console.log('getTransactions: Transformed:', transformedTransactions);
        return transformedTransactions;
      } catch (error) {
        console.error('getTransactions: Error:', error.message);
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }
    },
    getTransactionByReference: async (_, { reference }, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('getTransactionByReference: Fetching for user:', userId, 'reference:', reference);
        const transaction = await Transaction.findOne({ 
          reference: { $regex: `^${reference}$`, $options: 'i' }, 
          userId 
        });
        if (!transaction) {
          console.log('getTransactionByReference: No transaction found for reference:', reference, 'userId:', userId);
          throw new Error('Transaction not found');
        }
        const txObject = transaction.toObject();
        if (!txObject._id) {
          console.error('getTransactionByReference: Missing _id for transaction:', txObject);
          throw new Error('Invalid transaction data');
        }
        const transformedTransaction = {
          id: txObject._id.toString(),
          reference: txObject.reference,
          amount: txObject.amount,
          status: txObject.status,
          type: txObject.type,
          interval: txObject.interval,
          planCode: txObject.planCode,
          createdAt: txObject.createdAt instanceof Date ? txObject.createdAt.toISOString() : txObject.createdAt,
          address: txObject.address,
          phone: txObject.phone,
          company: txObject.company,
          houseAddress: txObject.houseAddress,
          houseType: txObject.houseType,
          cleaningOptions: txObject.cleaningOptions,
        };
        console.log('getTransactionByReference: Transformed:', transformedTransaction);
        return transformedTransaction;
      } catch (error) {
        console.error('getTransactionByReference: Error:', error.message);
        throw new Error(`Failed to fetch transaction: ${error.message}`);
      }
    },
    matchCleaners: async (_, { clientId }, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('matchCleaners: Fetching for client:', clientId, 'by user:', userId);
        if (userId !== clientId) throw new Error('Unauthorized');
        const client = await User.findById(clientId);
        if (!client || client.role !== 'client') throw new Error('Client not found');
        const cleaners = await User.find({ role: 'cleaner' });
        if (!client.location.coordinates) {
          return cleaners.filter(cleaner => 
            cleaner.location.address.toLowerCase().includes(client.location.address.toLowerCase().split(',')[0])
          );
        }
        const matchedCleaners = cleaners
          .filter(cleaner => cleaner.location.coordinates)
          .map(cleaner => ({
            ...cleaner.toObject(),
            distance: haversineDistance(client.location.coordinates, cleaner.location.coordinates)
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);
        console.log('matchCleaners: Matched:', matchedCleaners.map(c => ({ id: c._id, distance: c.distance })));
        return matchedCleaners.map(cleaner => ({
          ...cleaner,
          id: cleaner._id.toString()
        }));
      } catch (error) {
        console.error('matchCleaners: Error:', error.message);
        throw new Error(`Failed to match cleaners: ${error.message}`);
      }
    },
    getAvailableJobs: async (_, __, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('getAvailableJobs: Fetching for user:', userId);
        const user = await User.findById(userId);
        if (!user || user.role !== 'cleaner') throw new Error('Only cleaners can view jobs');
        const jobs = await Job.find({ status: 'open' });
        console.log('getAvailableJobs: Found:', jobs.length);
        return jobs.map(job => ({
          id: job._id.toString(),
          clientId: job.clientId.toString(),
          transactionId: job.transactionId.toString(),
          location: job.location,
          status: job.status,
          createdAt: job.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error('getAvailableJobs: Error:', error.message);
        throw new Error(`Failed to fetch jobs: ${error.message}`);
      }
    },
  },
  Mutation: {
    signup: async (_, { firstName, lastName, email, password, role, location }) => {
      try {
        console.log('signup: Starting with input:', { firstName, lastName, email, password: '***', role, location });
        if (!firstName || !lastName || !email || !password || !role || !location?.address) {
          console.log('signup: Validation failed: Missing fields');
          throw new Error('All fields are required');
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          console.log('signup: Validation failed: Invalid email');
          throw new Error('Invalid email format');
        }
        if (password.length < 6) {
          console.log('signup: Validation failed: Short password');
          throw new Error('Password must be at least 6 characters');
        }
        if (!['client', 'cleaner'].includes(role)) {
          console.log('signup: Validation failed: Invalid role');
          throw new Error('Role must be client or cleaner');
        }
        console.log('signup: Checking MongoDB connection');
        if (mongoose.connection.readyState !== 1) {
          console.error('signup: MongoDB not connected');
          throw new Error('Database connection error');
        }
        console.log('signup: Checking for existing user');
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          console.log('signup: Email already exists:', email);
          throw new Error('Email already exists');
        }
        console.log('signup: Hashing password');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('signup: Password hashed successfully');
        console.log('signup: Creating user in MongoDB');
        const user = await User.create({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role,
          location
        });
        console.log('signup: User created with ID:', user._id);
        console.log('signup: Checking JWT_SECRET');
        if (!process.env.JWT_SECRET) {
          console.error('signup: JWT_SECRET is undefined');
          throw new Error('Server configuration error');
        }
        console.log('signup: Generating JWT token');
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        console.log('signup: Token generated for user:', user._id);
        console.log('signup: Returning AuthPayload');
        return {
          token,
          user: {
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            location: user.location,
            subscription: user.subscription || null,
          },
        };
      } catch (error) {
        console.error('signup: Error occurred:', error.message, error.stack);
        throw new Error(`Signup failed: ${error.message}`);
      }
    },
    login: async (_, { email, password }) => {
      try {
        console.log('login: Email:', email);
        console.log('login: Looking for user in DB');
        const user = await User.findOne({ email });
        console.log('login: Found user?', !!user);
        if (!user) throw new Error('Invalid email or password');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Invalid email or password');
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );
        return { token, user };
      } catch (error) {
        console.error('login: Error:', error.message, error.stack);
        throw new Error(`Login failed: ${error.message}`);
      }
    },
    initializePayment: async (_, { input }, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('initializePayment: userId:', userId);
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        const { amount, type, address, phone, company } = input;
        const reference = `pay_${Date.now()}_${user._id}`;
        console.log('initializePayment: amount:', amount, 'reference:', reference);
        const response = await paystack.initializeTransaction(
          user.email,
          amount,
          reference,
          { userId: user._id.toString(), type: type || 'one-time' }
        );
        console.log('initializePayment: Paystack response:', response);

        const newTransaction = await Transaction.create({
          userId: user._id,
          reference,
          amount,
          status: 'pending',
          type: type || 'one-time',
          address,
          phone,
          company,
        });
        await newTransaction.save();
        console.log('initializePayment: Transaction saved:', newTransaction);

        return {
          accessCode: response.access_code,
          authorizationUrl: response.authorization_url,
          reference,
          status: response.status ? 'success' : 'failed'
        };
      } catch (error) {
        console.error('initializePayment: Error:', error.message);
        throw new Error(`Failed to initialize payment: ${error.message}`);
      }
    },
    initializeSubscription: async (_, { input }, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('initializeSubscription: userId:', userId);
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        const { amount, interval, type, houseAddress, houseType, cleaningOptions } = input;
        const reference = `sub_${Date.now()}_${user._id}`;
        console.log('initializeSubscription: amount:', amount, 'interval:', interval, 'reference:', reference);

        const allowedIntervals = ['weekly', 'monthly', 'annually'];
        const normalizedInterval = interval?.toLowerCase();
        if (!normalizedInterval || !allowedIntervals.includes(normalizedInterval)) {
          throw new Error('Invalid interval selected. Allowed values: daily, weekly, monthly, annually.');
        }

        const planResponse = await paystack.createPlan(
          amount,
          normalizedInterval,
          `Subscription_${normalizedInterval}_${user._id}`
        );
        console.log('initializeSubscription: Plan created:', planResponse);

        const response = await paystack.initializeTransaction(
          user.email,
          amount,
          reference,
          { userId: user._id.toString(), type: type || 'subscription', interval: normalizedInterval },
          planResponse.plan_code
        );
        console.log('initializeSubscription: Paystack response:', response);

        const newTransaction = await Transaction.create({
          userId: user._id,
          reference,
          amount,
          status: 'pending',
          type: type || 'subscription',
          interval: normalizedInterval,
          planCode: planResponse.plan_code,
          houseAddress,
          houseType,
          cleaningOptions,
        });
        await newTransaction.save();
        console.log('initializeSubscription: Transaction saved:', newTransaction);

        return {
          accessCode: response.access_code,
          authorizationUrl: response.authorization_url,
          reference,
          status: response.status ? 'success' : 'failed',
        };
      } catch (error) {
        console.error('initializeSubscription: Error:', error.message);
        throw new Error(`Failed to initialize subscription: ${error.message}`);
      }
    },
    verifyPaymentTransaction: async (_, { reference }, context) => {
      try {
        const userId = await authMiddleware(context.req);
        console.log('verifyPaymentTransaction: userId:', userId, 'reference:', reference);
        const transaction = await Transaction.findOne({ 
          reference: { $regex: `^${reference}$`, $options: 'i' }, 
          userId 
        });
        if (!transaction) {
          console.log('verifyPaymentTransaction: No transaction found for reference:', reference, 'userId:', userId);
          throw new Error('Transaction not found');
        }

        const paystackResponse = await paystack.verifyTransaction(reference);
        console.log('verifyPaymentTransaction: Paystack response:', paystackResponse);

        transaction.status = paystackResponse.status;
        transaction.createdAt = new Date(paystackResponse.transaction_date || Date.now());
        await transaction.save();

        if (paystackResponse.status === 'success') {
          const user = await User.findById(userId);
          if (transaction.type === 'subscription') {
            user.subscription = {
              planCode: paystackResponse.plan?.plan_code || transaction.planCode,
              authorizationCode: paystackResponse.authorization?.authorization_code,
              status: 'active',
              nextPaymentDate: new Date(
                paystackResponse.next_payment_date ||
                Date.now() + (transaction.interval === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)
              ),
            };
          }
          await user.save();

          // Create job for cleaners
          const job = await Job.create({
            clientId: user._id,
            transactionId: transaction._id,
            location: user.location,
            status: 'open',
          });
          console.log('verifyPaymentTransaction: Job created:', job._id);

          // Send payment notification email
          try {
            const txObject = transaction.toObject();
            await sendPaymentNotification({
              reference: txObject.reference,
              amount: txObject.amount,
              status: txObject.status,
              type: txObject.type,
              interval: txObject.interval,
              planCode: txObject.planCode,
              createdAt: txObject.createdAt,
              address: txObject.address,
              phone: txObject.phone,
              company: txObject.company,
              houseAddress: txObject.houseAddress,
              houseType: txObject.houseType,
              cleaningOptions: txObject.cleaningOptions,
            });
            console.log('verifyPaymentTransaction: Payment notification email sent to:', process.env.ADMIN_EMAIL);
          } catch (emailError) {
            console.error('verifyPaymentTransaction: Failed to send email:', emailError.message);
          }
        }

        const txObject = transaction.toObject();
        return {
          id: txObject._id.toString(),
          reference: txObject.reference,
          amount: txObject.amount,
          status: txObject.status,
          type: txObject.type,
          interval: txObject.interval,
          planCode: txObject.planCode,
          createdAt: txObject.createdAt instanceof Date ? txObject.createdAt.toISOString() : txObject.createdAt,
          address: txObject.address,
          phone: txObject.phone,
          company: txObject.company,
          houseAddress: txObject.houseAddress,
          houseType: txObject.houseType,
          cleaningOptions: txObject.cleaningOptions,
        };
      } catch (error) {
        console.error('verifyPaymentTransaction: Error:', error.message);
        throw new Error(`Failed to verify payment: ${error.message}`);
      }
    },
  },
};