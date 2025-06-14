const axios = require('axios');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

const withRetry = async (fn, retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'ECONNRESET' && attempt < retries) {
        console.warn(`Paystack API ECONNRESET, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      throw error;
    }
  }
};

const paystack = {
  async initializeTransaction(email, amount, reference, metadata, plan) {
    try {
      const payload = {
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        metadata: {
          ...metadata,
          channels: ['card', 'bank', 'ussd', 'bank_transfer', 'payattitude'], // Enable all channels
        },
      };
      if (plan) {
        payload.plan = plan;
      }
      const response = await withRetry(() => axios.post(
        'https://api.paystack.co/transaction/initialize',
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      ));
      console.log('Paystack initializeTransaction response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Paystack initializeTransaction error:', error.message, error.code);
      throw new Error(error.response?.data?.message || 'Transaction initialization failed');
    }
  },

  async verifyTransaction(reference) {
    try {
      const response = await withRetry(() => axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      ));
      console.log('Paystack verifyTransaction response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Paystack verifyTransaction error:', error.message, error.code);
      throw new Error(error.response?.data?.message || 'Transaction verification failed');
    }
  },

  async createPlan(amount, interval = 'monthly', name) {
    const VALID_INTERVALS = ['daily', 'weekly', 'monthly', 'annually'];
    if (!VALID_INTERVALS.includes(interval)) {
      throw new Error('Invalid interval selected. Allowed values: daily, weekly, monthly, annually.');
    }
    try {
      const response = await withRetry(() => axios.post(
        'https://api.paystack.co/plan',
        {
          name: name || `Subscription Plan - ₦${amount} (${interval})`,
          interval,
          amount: amount * 100, // Convert to kobo
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      ));
      console.log('Paystack createPlan response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Paystack createPlan error:', error.message, error.code);
      throw new Error(error.response?.data?.message || 'Plan creation failed');
    }
  },

  async createSubscription(customer, planCode) {
    try {
      const response = await withRetry(() => axios.post(
        'https://api.paystack.co/subscription',
        {
          customer,
          plan: planCode,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          }
        }
      ));
      console.log('Paystack createSubscription response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Paystack createSubscription error:', error.message, error.code);
      throw new Error(error.response?.data?.message || 'Subscription creation failed');
    }
  },
};

module.exports = paystack;