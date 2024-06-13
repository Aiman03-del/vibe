const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  name: String,
  image: String,
  file: String,
  desc: String,
  duration: String,
});

module.exports = mongoose.model("song", songSchema);
