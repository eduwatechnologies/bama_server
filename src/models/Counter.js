const mongoose = require('mongoose');

// A tiny singleton-per-name counter collection. Used to maintain the
// global contentVersion number referenced throughout the sync system.
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function getNextValue(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return counter.value;
}

async function getCurrentValue(name) {
  const counter = await Counter.findOne({ name });
  return counter ? counter.value : 0;
}

module.exports = { Counter, getNextValue, getCurrentValue };
