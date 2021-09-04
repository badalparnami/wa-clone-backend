# WhatsApp Web App Clone Backend

Clone of WhatsApp Web.

View Demo [here](https://wa-clone.netlify.app/).

**To view the frontend code. Visit [here](https://github.com/badalparnami/wa-clone-frontend).**

## Usage

Create a [MongoDB](https://www.mongodb.com/cloud/atlas) atlas and [Cloudinary](https://cloudinary.com/) account.

1. Fork the repo and then Clone/Download it.
2. `cd wa-clone-backend`
3. Create `nodemon.json` file in the root directory.
4. Setup required environment variables.

```js
{
  "env": {
    "DB_USER": //Database username,
    "DB_PASS": //Database password,
    "DB_NAME": //Database name,
    "ACCESS": "*",
    "CLIENT": //Frontend URL e.g. "http://localhost:3000",
    "JWT": //Random string,
    "CLOUDINARY_CLOUD_NAME": //Cloudinary cloud name,
    "CLOUDINARY_API_KEY": //Cloudinary API key,
    "CLOUDINARY_API_SECRET": //Cloudinary API secret
  }
}

```

5. Change ACCESS property (if require)
6. Run `npm install`
7. Run `npm run server` to start the local server at port 8080.

## Structure

```bash
.
├── app.js
├── http-error.js
├── roomActions.js
├── socket.js             #Socket initialization
├── utils.js
├── controllers
│   ├── auth.js
│   ├── message.js             #Of no use
│   ├── user.js
├── middlewares
│   ├── file-upload.js
│   ├── is-auth.js
├── models
│   ├── conversation.js
│   ├── tokenbl.js
│   ├── user.js
├── routes
│   ├── auth.js
│   ├── message.js             #of no use
│   ├── user.js
├── uploads             #Mandatory Folder and sub-folder
│   ├── images
```

## API ENDPOINTS

> /api/auth

| Endpoint | Method | Payload                                                                         | Description     |
| -------- | ------ | ------------------------------------------------------------------------------- | --------------- |
| /login   | POST   | { email: 'test@test.com', password: 'iAmStrong'}                                | Login User      |
| /signup  | POST   | { name: 'Test, email: 'test@test.com', username: 'test', password: 'iAmStrong'} | Signup User     |
| /logout  | POST   | { token: 'CanBeDecodeBySpecialString'}                                          | Blocklist token |

> /api/user

| Endpoint                                       | Method | Payload                  | Description                                      |
| ---------------------------------------------- | ------ | ------------------------ | ------------------------------------------------ |
| /profile                                       | GET    | None                     | Get data of a logged-in user                     |
| /search/{term}                                 | GET    | None                     | Search users based on provided term              |
| /conversation/create                           | POST   | { username: 'testuser' } | Create a conversation with the provided username |
| /conversations                                 | GET    | None                     | Get all conversations of a logged-in user        |
| /conversation/{conversationId}                 | GET    | None                     | Get conversation data of a provided id           |
| /conversation/{conversationId}/{lastMessageId} | GET    | None                     |                                                  |
| /avatar                                        | POST   |                          | Add avatar                                       |
| /avatar                                        | DELETE | None                     | Remove avatar                                    |

## Sockets

| Name                                | Event             | Description                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| join                                | listener          | Whenever user connect to the backend, this event will add the user to the `users` array (defined in `roomActions.js`). Each object in `users` array contain `id of the user`, `socket id` and `currPage` (an object) which stores `conversationId`, `otherId` (to whom user is conversing right now) and `username` (other person's username) |
| messageReadMain and messageReadChat | emitter           |                                                                                                                                                                                                                                                                                                                                               |
| {username}JOINED - online           | broadcast emitter | Whenever a new user joins, we will check is there any user who is right now conversing with the new user. If it is then we will emit the `online`                                                                                                                                                                                             |
| updatePage                          | listener          | Update the `conversationId` in user object                                                                                                                                                                                                                                                                                                    |
| updateUsername                      | listener          | Update the `username` in user object                                                                                                                                                                                                                                                                                                          |
| isOnline                            | listener          | Checks if other user (to whom we are conversing right now) is online. If it is then emit `online`                                                                                                                                                                                                                                             |
| newMessage                          | listener          | Whenever someone sends a new message, this listener will listen                                                                                                                                                                                                                                                                               |
| forChat and forSidebar              | emitter           | Sends the new message which is received by `newMessage` listener                                                                                                                                                                                                                                                                              |
| typingStarted                       | listener          | Whenever someone starts typing this listener will listen                                                                                                                                                                                                                                                                                      |
| forChatTyping and forSidebarTyping  | emitter           | Sends the other user is typing                                                                                                                                                                                                                                                                                                                |
| typingStopped                       | listener          | Whenever someone stopped typing this listener will listen                                                                                                                                                                                                                                                                                     |
| disconnect                          | listener          | Whenever user leaves the website, `lastSeen` will emit to `{username}LEFT` broadcaster                                                                                                                                                                                                                                                        |

## Build with

- Express
- Bcryptjs
- Cloudinary
- Express-Validator
- Jsonwebtoken
- Mongoose
- Multer
- Socket. io
- Nodemon (dev dependency)
