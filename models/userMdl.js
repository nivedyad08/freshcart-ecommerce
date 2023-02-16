const mongoose = require("mongoose");
const Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

const userSchema = new Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
  },
  is_verified: {
    type: Boolean,
    required: true,
  },
  address: [
    {
      id: { type: Number },
      firstName: { type: String },
      lastName: { type: String },
      address1: { type: String },
      address2: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: Number },
      default: { type: Boolean },
      addrname: { type: String },
      _id:false,
    },
  ],
  cart: [
    {
      productId: { type: ObjectId },
      quantity: { type: Number },
      _id:false,
    },
  ],
  wallet: {
    type: Number,
    required: true,
  },
  token: {
    type: Number,
    required:true
  },
});

module.exports = mongoose.model("user", userSchema);
