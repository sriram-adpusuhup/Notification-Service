const { couchbaseService } = require('node-utils');
const { v4: uuid } = require('uuid');
const { COUCHBASE } = require('../../configs/config');

const NOTIFICATION_KEY = 'notif::';

const notificationBucket = couchbaseService(COUCHBASE.HOST, COUCHBASE.BUCKET, COUCHBASE.USERNAME, COUCHBASE.PASSWORD);

const API = {
    addNotification: async (notification, email) => {
        const id = uuid();
        const docId = `${NOTIFICATION_KEY}${id}`;
        const newNotification = {
            id,
            message: notification.message,
            actionUrl: notification.actionUrl,
            siteId: notification.siteId,
            notificationMeta: notification.meta,
            userEmail: email,
            hasReceived: false,
            hasRead: false,
            readNotificationOn: null,
            hasUserActedOnIt: false,
            actionOn: null    
        }
        await notificationBucket.createDoc(docId, newNotification, {});
        const notificationDoc = await notificationBucket.getDoc(docId);
        return notificationDoc.value;
    },
    getNotificationById: id => {
        try {
            return notificationBucket.getDoc(`${NOTIFICATION_KEY}${id}`)
        } catch (e) {
            return null;
        }
    },
    getUserPendingNotifications: async email => {
        const query = `SELECT * FROM apNotificationBucket WHERE userEmail = '${email}' ORDER BY dateCreated DESC, hasReceived, hasRead LIMIT 10;`
        const notificationsDocs = await notificationBucket.queryDB(query);
        const notifications = notificationsDocs.map(doc => doc.apNotificationBucket);
        return notifications;
    },
    updateNotificationReceived: async id => {
        const notification = await API.getNotificationById(id);
        if (!notification) throw new Error(`Unable to find notification with ID ${id}`);
        const updatedNotification = {...notification.value, hasReceived: true};
        return notificationBucket.updateDoc(`${NOTIFICATION_KEY}${id}`, updatedNotification);
    },
    setNotificationRead: async id => {
        const notification = await API.getNotificationById(id);
        if (!notification) throw new Error(`Unable to find notification with ID ${id}`);
        const updatedNotification = {...notification.value, hasRead: true, readNotificationOn: Date.now() };
        return notificationBucket.updateDoc(`${NOTIFICATION_KEY}${id}`, updatedNotification);
    },
    getNotifications: async (email, page, count) => {
        const offset = parseInt(page) * parseInt(count);
        const query = `SELECT * FROM apNotificationBucket WHERE userEmail = '${email}' OFFSET ${offset} LIMIT ${count}`;
        return notificationBucket.queryDB(query);
    }
};

module.exports = API;