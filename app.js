const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const messageRoutes = require("./routes/message");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

const {
  addUser,
  removeUser,
  updateUser,
  findUserByUserId,
  findUserBySocketId,
  allUsers,
  findAllUsers,
  updateUsername,
  updateConversation,
} = require("./roomActions");

const PORT = process.env.PORT || 8080;

const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hubm7.gcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(express.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ACCESS);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

app.use("/api", messageRoutes);

app.use((error, req, res, next) => {
  const status = error.code || error.status_code || err.status || 500;
  res.status(status);
  res.json({ message: error.message || "Something went wrong" });
});

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((result) => {
    console.log("db connected");

    const server = app.listen(PORT);
    const io = require("./socket").init(server);

    io.on("connection", (socket) => {
      // console.log("Client connected", socket.id);

      // setInterval(() => {
      //   console.log(allUsers());
      // }, 5000);

      socket.on("join", async ({ token }) => {
        if (!token) {
          return;
        }
        const [user, connectedSockets] = await addUser(token, socket.id);

        if (connectedSockets.length > 0) {
          connectedSockets.forEach((connectedSocket) => {
            io.to(connectedSocket.socketId).emit("messageReadMain", {
              convoId: connectedSocket.conversationId,
              status: "double",
            });
            io.to(connectedSocket.socketId).emit("messageReadChat", {
              convoId: connectedSocket.conversationId,
              status: "double",
            });
          });
        }

        if (user) {
          const allUsers = findAllUsers(user.id);

          if (allUsers.length > 0) {
            const username = allUsers[0].currPage.username;
            allUsers.forEach((user) =>
              io.in(user.socketId).socketsJoin(`${username}JOINED`)
            );

            io.to(`${username}JOINED`).emit("online", username);

            io.socketsLeave(`${username}JOINED`);
          }
        }
      });

      socket.on("updatePage", async ({ conversationId }) => {
        await updateUser(socket.id, conversationId);
      });

      socket.on("updateUsername", (username) => {
        updateUsername(socket.id, username);

        const userData = findUserBySocketId(socket.id);

        if (!userData) return;

        const otherUserData = findUserByUserId(userData.currPage.otherId);

        if (!otherUserData) return;

        io.to(userData.socketId).emit("online", username);
      });

      socket.on("isOnline", () => {
        const userData = findUserBySocketId(socket.id);

        if (!userData) return;

        const otherUserData = findUserByUserId(userData.currPage.otherId);

        if (!otherUserData) return;

        io.to(userData.socketId).emit("online", userData.currPage.username);
      });

      socket.on("newMessage", async (message) => {
        if (typeof message === "string" && message.length === 0) {
          return;
        }
        const [
          forSenderMain,
          forSenderSidebar,
          forReceiverMain,
          forReceiverSidebar,
          receiverData,
          receiverMessageStatus,
        ] = await updateConversation(socket.id, message);

        io.to(socket.id).emit("forChat", forSenderMain);
        io.to(socket.id).emit("forSidebar", forSenderSidebar);

        if (receiverData) {
          io.to(receiverData.socketId).emit("forSidebar", forReceiverSidebar);
          if (receiverMessageStatus === "read") {
            io.to(receiverData.socketId).emit("forChat", forReceiverMain);
          }
        }
      });

      socket.on("typingStarted", () => {
        const userData = findUserBySocketId(socket.id);
        if (userData) {
          const otherUser = findUserByUserId(userData.currPage.otherId);
          if (otherUser) {
            if (otherUser.currPage.otherId == userData.id) {
              io.to(otherUser.socketId).emit("forChatTyping", {
                convoId: userData.currPage.conversationId,
                status: true,
              });
            }
            io.to(otherUser.socketId).emit("forSidebarTyping", {
              convoId: userData.currPage.conversationId,
              status: true,
            });
          }
        }
      });

      socket.on("typingStopped", () => {
        const userData = findUserBySocketId(socket.id);
        if (userData) {
          const otherUser = findUserByUserId(userData.currPage.otherId);
          if (otherUser) {
            if (otherUser.currPage.otherId == userData.id) {
              io.to(otherUser.socketId).emit("forChatTyping", {
                convoId: userData.currPage.conversationId,
                status: false,
              });
            }
            io.to(otherUser.socketId).emit("forSidebarTyping", {
              convoId: userData.currPage.conversationId,
              status: false,
            });
          }
        }
      });

      socket.on("disconnect", async () => {
        const userData = findUserBySocketId(socket.id);
        if (userData) {
          const allUsers = findAllUsers(userData.id);

          if (allUsers.length > 0) {
            const username = allUsers[0].currPage.username;
            allUsers.forEach((user) =>
              io.in(user.socketId).socketsJoin(`${username}LEFT`)
            );

            io.to(`${username}LEFT`).emit("lastSeen", username);

            io.socketsLeave(`${username}LEFT`);
          }
        }

        await removeUser(socket.id);
        // console.log("Client disconnected", socket.id);
      });
    });
  })
  .catch((err) => {
    console.log(err);
  });
