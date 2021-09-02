const jwt = require("jsonwebtoken");
const ObjectId = require("mongoose").Types.ObjectId;
const cloudinary = require("cloudinary").v2;

const Conversation = require("./models/conversation");
const User = require("./models/user");
const HttpError = require("./http-error");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// const { MONTH, isToday, isYesterday } = require("./utils");

const users = [];

const decodeToken = (token) => {
  const decodedToken = jwt.verify(token, process.env.JWT);

  return decodedToken.userId;
};

const updateMessageStatusToDouble = async (userId) => {
  let users;

  try {
    users = await User.aggregate([
      {
        $match: {
          _id: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "conversations",
          localField: "conversations.cId",
          foreignField: "_id",
          as: "convos",
        },
      },
      {
        $unwind: {
          path: "$convos",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          myStatus: {
            $filter: {
              input: "$convos.status",
              as: "item",
              cond: {
                $eq: ["$$item.id", new ObjectId(userId)],
              },
            },
          },
          otherUserId: {
            $filter: {
              input: "$convos.users",
              as: "item",
              cond: {
                $ne: ["$$item", new ObjectId(userId)],
              },
            },
          },
        },
      },
      {
        $project: {
          singleCountGtThan0: {
            $filter: {
              input: "$myStatus.singleCount",
              as: "item",
              cond: {
                $ne: ["$$item", 0],
              },
            },
          },
          otherUserId: 1,
          myStatus: 1,
          cId: "$convos._id",
          _id: 0,
        },
      },
      {
        $unwind: {
          path: "$singleCountGtThan0",
          preserveNullAndEmptyArrays: false,
        },
      },
    ]);
  } catch (err) {}

  /*
  mystatus = array of object select 0th element (singleCount, totalCount, status)
  otherUserId = array, select 0th element
  cId =  conversation id
  singleCountGtThan0 = total number of single count
  */

  if (users.length === 0) {
    return [];
  }

  const userConnected = [];

  users.forEach((user) => {
    const socketId = findUserByUserId(user.otherUserId[0].toString());
    if (!socketId) {
      return;
    }
    userConnected.push({
      socketId: socketId.socketId,
      conversationId: user.cId,
    });
  });

  const conversationIds = users.map((user) => user.cId);

  let updateStatus;
  try {
    updateStatus = await Conversation.bulkWrite([
      {
        updateMany: {
          filter: {
            _id: { $in: conversationIds },
            "status.id": new ObjectId(userId),
          },
          update: {
            $set: {
              "status.$.status": "double",
              "status.$.singleCount": 0,
            },
          },
        },
      },
    ]);
  } catch (err) {
    console.log("error is", err);
  }

  if (userConnected.length === 0) {
    return [];
  }

  return userConnected;
};

const addUser = async (token, socketId) => {
  const userId = decodeToken(token);

  //if not, it will return undefined
  const user = users.find((user) => user.id === userId);

  if (user && user.socketId === socketId) {
    return user;
  }

  if (user && user.socketId !== socketId) {
    removeUser(user.socketId);
  }

  const connectedSockets = await updateMessageStatusToDouble(userId);

  const newUser = {
    id: userId,
    socketId,
    currPage: {
      conversationId: null,
      otherId: null,
      username: null,
    },
  };

  users.push(newUser);

  return [newUser, connectedSockets];
};

const removeUser = async (socketId) => {
  const indexOf = users.map((user) => user.socketId).indexOf(socketId);

  if (indexOf !== -1) {
    const user = users[indexOf];
    try {
      await User.updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { lastSeen: Date.now() } }
      );
    } catch (err) {}

    users.splice(indexOf, 1);
  }
};

// const isUserConnected = (token) => {
//   const userId = decodeToken(token);
//   return users.find((user) => user.id === userId);
// };

const allUsers = () => users;

const updateUser = async (socketId, page) => {
  const index = users.map((user) => user.socketId).indexOf(socketId);

  if (index !== -1) {
    let conversationDetails;
    if (page !== "noConvo") {
      try {
        conversationDetails = await Conversation.findById(page)
          .select({ status: 1 })
          .lean();
      } catch (err) {}

      if (!conversationDetails) {
        return;
      }

      const otherUserIndex = conversationDetails.status.find(
        (status) => status.id != users[index].id
      );

      users[index].currPage = {
        conversationId: page,
        otherId: otherUserIndex.id,
        username: null,
      };
    } else {
      users[index].currPage = {
        conversationId: page,
        otherId: "noId",
        username: "noU",
      };
    }
  }
};

const updateUsername = (socketId, username) => {
  const index = users.map((user) => user.socketId).indexOf(socketId);

  if (index !== -1) {
    users[index].currPage.username = username;
  }
};

const findUserByUserId = (userId) => {
  if (userId === "noId") {
    return null;
  }
  return users.find((user) => user.id == userId);
};

const findUserBySocketId = (socketId) =>
  users.find((user) => user.socketId == socketId);

//finding all users having conversation with particular userId
const findAllUsers = (userId) =>
  users.filter((user) => user.currPage.otherId == userId);

const updateConversation = async (socketId, message) => {
  const user = findUserBySocketId(socketId);

  let conversation, otherUserStatus;
  try {
    conversation = await Conversation.findById(user.currPage.conversationId)
      .select({ users: 1 })
      .lean();
  } catch (err) {}

  const otherUser = findUserByUserId(user.currPage.otherId);
  if (!otherUser) {
    otherUserStatus = "sent";
  } else {
    if (
      otherUser.currPage.conversationId === user.currPage.conversationId &&
      user.currPage.conversationId !== "noConvo"
    ) {
      otherUserStatus = "read";
    } else {
      otherUserStatus = "double";
    }
  }

  const date = Date.now();

  let newMessageToAdd, media;

  if (typeof message === "string") {
    newMessageToAdd = {
      message,
      sender: new ObjectId(user.id),
      receiver: new ObjectId(user.currPage.otherId),
      date,
    };
  } else {
    await cloudinary.uploader.upload(message.file, (error, image) => {
      if (error) {
        console.log(error);
      } else {
        media = image.secure_url;

        newMessageToAdd = {
          message: image.secure_url,
          sender: new ObjectId(user.id),
          receiver: new ObjectId(user.currPage.otherId),
          date,
          image: true,
        };
      }
    });
  }

  try {
    if (otherUserStatus !== "read") {
      await Conversation.updateOne(
        {
          _id: new ObjectId(user.currPage.conversationId),
          "status.id": new ObjectId(user.currPage.otherId),
        },
        {
          $set: {
            "status.$.status": otherUserStatus,
          },
          $inc: {
            "status.$.singleCount": otherUserStatus === "sent" ? 1 : 0,
            "status.$.totalCount": 1,
          },
          $push: { messages: newMessageToAdd },
        }
      );
    } else {
      await Conversation.updateOne(
        {
          _id: new ObjectId(user.currPage.conversationId),
        },
        { $push: { messages: newMessageToAdd } }
      );
    }
  } catch (err) {
    console.log(err);
  }

  const toSenderMain = {
    content: typeof message === "string" ? message : media,
    sender: 0,
    time: date,
    status: otherUserStatus,
    image: typeof message === "string" ? false : true,
  };

  const toReceiverMain = { ...toSenderMain, sender: 1, status: null };

  const toSenderSidebar = {
    id: conversation._id,
    unread: 0,
    lastMessage: {
      content: typeof message === "string" ? message : media,
      date,
      status: otherUserStatus,
      image: typeof message === "string" ? false : true,
    },
  };

  const toReceiverSidebar = {
    ...toSenderSidebar,
    unread: otherUserStatus === "read" ? 0 : 1,
    lastMessage: {
      ...toSenderSidebar.lastMessage,
      status: null,
    },
  };

  return [
    toSenderMain,
    toSenderSidebar,
    toReceiverMain,
    toReceiverSidebar,
    otherUser,
    otherUserStatus,
  ];
};

module.exports = {
  addUser,
  removeUser,
  updateUser,
  findUserByUserId,
  findUserBySocketId,
  allUsers,
  findAllUsers,
  updateUsername,
  updateConversation,
};
