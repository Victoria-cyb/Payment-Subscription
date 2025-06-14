const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
 firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'cleaner'], required: true },
  location: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  subscription: {
    planCode: String,
    authorizationCode: String,
    status: String,
    nextPaymentDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);