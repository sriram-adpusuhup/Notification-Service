const express = require('express');
const http = require('http');
const socket = require('socket.io');
const {v4: uuid} = require('uuid');

const config = require('../configs/config');
const authService = require('./services/authToken');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.use(express.json());

const tempStore = {
    'sriram.r@adpushup.com': {}
};

// app.locals.io = io;

app.post('/notification', (req, res) => {
    const notificationBody = req.body;
    const notificationId = uuid();

    const newNotification = {id: notificationId, ...notificationBody, isRead: false};
    tempStore[req.body.email] = {...tempStore[req.body.email], [notificationId]: notificationBody};

    // io.to(notificationBody.email).emit('newNotification', newNotification, notificationId => {
    //     console.log(`Received acknowledged for notification ${notificationId}`);
    // });

    io.sockets.to(notificationBody.email).emit('newNotification', newNotification);

    return res.json({
        message: 'Notification Posted Successfully',
        id: notificationId
    });
});

app.get('/notification', (req, res) => {
    return res.json({
        notifications: Object.values(tempStore)
    });
});

// authorize users;
io.use((socket, next) => {
    const authToken = socket.handshake.query.authToken;
    if (!authService.isValidToken(authToken)) {
        return next(new Error('Invalid Auth Token'));
    }
    next();
});

io.on('connection', socket => {
    const authToken = socket.handshake.query.authToken;
    const user = authService.decodeAuthToken(authToken);
    console.log(`New user connected ${user.email}`);
    socket.join(user.email);

    // Send previous unread notifications that were never sent
    io.to(user.email).emit('prevNotifications', {
        notifications: tempStore[user.email] || []
    });

    // REQUIRED: to make sure we disconnect all listeners on page refresh - or we'll get multiple listeners with multiple notifications
    socket.on('disconnect', () => {
        console.log('disconnecting...');
        socket.removeAllListeners();
    });

    // when a notification is read, call this event with the notification ID
    socket.on('notificationReceived', notificationId => {
        console.log('Socket notification received', notificationId);
        tempStore[user.email][notificationId].isRead = true;
    });
});


server.listen(config.PORT, () => {
    console.log(`Server started on port ${config.PORT}`);
});