const express = require('express');
const notificationService = require('./services/notificationService');
const authService = require('./services/authService');
const router = express.Router();

router.post('/notification', async (req, res) => {
    console.log('Received Notification');
    const notificationBody = req.body;

    const notification = await notificationService.addNotification(notificationBody, notificationBody.email);

    req.app.locals.io.sockets.to(notificationBody.email).emit('newNotification', notification);

    return res.json({
        message: 'Notification Posted Successfully',
        id: notification.id
    });
});

// PIXEL API to update if a notification has been read
router.get('/notification/read/:id', async (req ,res) => {
    const notificationId = req.params.id;
    console.log(`Notification Read ${notificationId}`);
    if (!notificationId) return res.status(404).send();
    await notificationService.setNotificationRead(notificationId);
    res.send();
});

router.get('/notification', async (req, res) => {
    const authToken = req.headers.authorization;
    if (!authToken || !authService.isValidToken(authToken)) {
        return res.status(404).json({
            message: 'Invalid Token'
        });
    }
    const decodedData = authService.decodeAuthToken(authToken);
    console.log({decodedData});
    const {
        page = 0,
        count = 10
    } = req.query;

    const notifications = await notificationService.getNotifications(decodedData.email, page, count);

    return res.json({
        notifications 
    });
});

module.exports = router;