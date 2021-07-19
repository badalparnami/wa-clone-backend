const express = require("express");
const router = express.Router();

const messageController = require("../controllers/message");

router.post("/message", messageController.createMessage);

module.exports = router;
