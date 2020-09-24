const express = require("express");
const http = require("http");
const socket = require("socket.io");
const cors = require("cors");

const config = require("../configs/config");
const authService = require("./services/authService");
const notificationService = require("./services/notificationService");
const routes = require("./routes");
const couchbase = require("./services/couchbase");

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.use(express.json());
app.use(cors());

app.locals.io = io;

app.use(routes);

app.get("/", (req, res) => {
  return res.send("Notification Service Up and Running");
});

// authorize users;
io.use((socket, next) => {
  const authToken = socket.handshake.query.authToken;
  if (!authService.isValidToken(authToken)) {
    return next(new Error("Invalid Auth Token"));
  }
  // MAKE sure it's not adpushup using the account
  const tokenPayload = authService.decodeAuthToken(authToken);
  // comment this out during testing.
  // if (tokenPayload.isSuperUser) return next(new Error('Not super user'));
  next();
});

io.on("connection", async (socket) => {
  const authToken = socket.handshake.query.authToken;
  const user = authService.decodeAuthToken(authToken);
  socket.join(user.email);

  // Send previous unread notifications that were never sent
  const pendingNotifications = await notificationService.getUserPendingNotifications(
    user.email
  );
  io.to(user.email).emit("prevNotifications", {
    notifications: pendingNotifications || [],
  });

  // REQUIRED: to make sure we disconnect all listeners on page refresh - or we'll get an extra listener registered with each refresh.
  socket.on("disconnect", () => {
    socket.removeAllListeners();
  });

  // when a notification is read, call this event with the notification ID
  socket.on("notificationReceived", async (notificationId) => {
    await notificationService.updateNotificationReceived(notificationId);
  });

  socket.on("notificationActedOn", async (notificationId) => {
    await notificationService.updateNotificationActedOn(notificationId);
  });
});

couchbase
  .connectToNotificationBucket()
  .then(() => {
    server.listen(config.PORT, () => {
      console.log(`Server started on port ${config.PORT}`);
    });
  })
  .catch(console.error);
