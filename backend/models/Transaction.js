const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  type: { type: String, enum: ['one-time', 'subscription'], required: true },
  interval: { type: String, enum: ['weekly', 'monthly', 'annually'], required: false },
  planCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  address: { type: String },
  phone: { type: String },
  company: { type: String },
  houseAddress: { type: String },
  houseType: { type: String },
  cleaningOptions: { type: String },
});

// Force ISO string for Date fields
transactionSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret.createdAt instanceof Date) {
      ret.createdAt = ret.createdAt.toISOString();
    }
    return ret;
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);