const express = require("express");
const router = express.Router();

const userControllers = require("../controllers/user");
const isAuth = require("../middlewares/is-auth");
const fileUpload = require("../middlewares/file-upload");

router.get("/profile", isAuth, userControllers.getProfile);

router.get("/search/:term", isAuth, userControllers.search);

router.post("/conversation/create", isAuth, userControllers.createConversation);

router.get("/conversations", isAuth, userControllers.getConversations);

router.get(
  "/conversation/:conversationId",
  isAuth,
  userControllers.getConversation
);

router.get(
  "/conversation/:conversationId/:lastMessageId",
  isAuth,
  userControllers.getConversationScrollable
);

router.post(
  "/avatar",
  isAuth,
  fileUpload.single("image"),
  userControllers.avatar
);

router.delete("/avatar", isAuth, userControllers.deleteAvatar);

module.exports = router;
