const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const convoSchema = new Schema({
  messages: [
    {
      message: { type: String, required: true },
      sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
      receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
      date: { type: Date },
      image: { type: Boolean, default: false },
    },
  ],
  users: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
  ],
  status: [],

  /*
  AFTER
  { id: "first user id", singleCount: 2, totalCount:7, status: 'sent' },
  */

  /*
  BEFORE
    { id: "first user id", count: 2, status: "sent" },
    { id: "second user id", count: 0, status: "read" },
  
  sent = single tick
  double = double tick or delivered
  read = blue tick

  Scenario 1
  John sends a message to Jane and Jane is not online. So, in this case jane's count will be incremented by 1 and status:'sent' 

  Now, when jane appears online, status: 'double' and when jane opens the conversation count will be set to 0 and status to 'read'

  Scenario 2
  John sends a message to Jane but Jane is talking to Joffrey. In this case count: +1 and status: 'double'

  Scenario 3
  John and Jane both having a conversation with each other. John sends a message to Jane.
  In this case status array will not be updated.

  */
});

module.exports = mongoose.model("Conversation", convoSchema);
