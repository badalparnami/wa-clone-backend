const io = require("../socket");

exports.createMessage = async (req, res, next) => {
  const { message } = req.body;
  io.getIO().emit("messages", { action: "create", message });

  res.status(201).json({ message });
};
