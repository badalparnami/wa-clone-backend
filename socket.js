let io;

module.exports = {
  init: (httpServer) => {
    io = require("socket.io")(httpServer, {
      cors: {
        origin: "https://wa-clone.netlify.app",
        methods: ["GET", "POST"],
      },
    });
    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized");
    }
    return io;
  },
};
