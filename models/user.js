const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  avatar: {
    type: String,
  },
  about: {
    type: String,
    default: "Hey There! I'm using Whatsapp Web Clone",
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  conversations: [
    {
      cId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Conversation",
      },
      with: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User",
      },
    },
  ],
});

/* 
  conversations: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Conversation",
    },
  ],
  withWhom: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
  ],

    conversations: [
    {
      [{
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User",
      }]: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "Conversation",
      },
    },
  ],
  
*/

module.exports = mongoose.model("User", userSchema);
