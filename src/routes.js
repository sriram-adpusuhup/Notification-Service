const express = require("express");
const notificationService = require("./services/notificationService");
const authService = require("./services/authService");
const config = require('./../configs/config');
const router = express.Router();

router.post("/notification", async (req, res) => {
  const notificationBody = req.body;

  const notification = await notificationService.addNotification(
    notificationBody,
    notificationBody.email
  );

  req.app.locals.io.sockets
    .to(notificationBody.email)
    .emit("newNotification", notification);

  return res.json({
    message: "Notification Posted Successfully",
    id: notification.id,
  });
});

router.get("/notification/click/:id", async (req, res) => {
  const notificationId = req.params.id;
  const actionUrl = req.query.actionUrl;

  if (!notificationId || !actionUrl) return res.send("NotificationService");

  await notificationService.updateNotificationActedOn(notificationId);
  return res.redirect(actionUrl);
});

router.post("/notification/read/:id", async (req, res) => {
  const notificationId = req.params.id;
  if (!notificationId) return res.status(404).send();
  await notificationService.setNotificationRead(notificationId);
  res.send();
});

router.get("/notification", async (req, res) => {
  const authToken = req.headers.authorization;
  if (!authToken || !authService.isValidToken(authToken)) {
    return res.status(404).json({
      message: "Invalid Token",
    });
  }
  const decodedData = authService.decodeAuthToken(authToken);
  const { page = 0, count = 10 } = req.query;

  const notifications = await notificationService.getNotifications(
    decodedData.email,
    page,
    count
  );
  const notificationsCount = await notificationService.getNotificationsCount(
    decodedData.email
  );

  const hasMore = notificationsCount > parseInt(page) * parseInt(count);

  return res.json({
    notifications,
    hasMore,
  });
});

// TODO: figure out service to service authentication for 
router.get('/notifications', async(req, res) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization === config.ADMIN_TOKEN) {
    return res.status(401).send('UnAuthorized Access');
  }

  let notifications = await notificationService.getAllNotifications();

  if (req.query.groupById && notifications.length) {
    notifications = notifications.reduce((result, notification) => {
      let groupId;
      if (notification.notificationMeta && notification.notificationMeta && notification.notificationMeta.groupId) {
        groupId = notification.notificationMeta.groupId;
      } else {
        groupId = 'UNKNOWN'
      }
      if (!result[groupId]) result[groupId] = [];
      return {
        ...result,
        [groupId]: [
          ...result[groupId],
          notification
        ]
      }
    }, {});
  }

  return res.json(notifications);
});

module.exports = router;
