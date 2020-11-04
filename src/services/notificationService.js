const couchbaseService = require("./couchbase");
const { v4: uuid } = require("uuid");
const { COUCHBASE } = require("../../configs/config");

const NOTIFICATION_KEY = "notif::";

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
      actionOn: null,
    };
    await couchbaseService.createDoc(docId, newNotification, {});
    const notificationDoc = await couchbaseService.getDoc(docId);
    return notificationDoc.value;
  },
  getNotificationById: (id) => {
    try {
      return couchbaseService.getDoc(`${NOTIFICATION_KEY}${id}`);
    } catch (e) {
      return null;
    }
  },
  updateNotification: (id, notification) => {
    return couchbaseService.updateDoc(`${NOTIFICATION_KEY}${id}`, notification);
  },
  getUserPendingNotifications: async (email, count) => {
    const query = `SELECT * FROM apNotificationBucket WHERE userEmail = '${email}' ORDER BY dateCreated DESC, hasReceived, hasRead;`;
    const notificationsDocs = await couchbaseService.queryDB(query);
    const notifications = notificationsDocs.map(
      (doc) => doc.apNotificationBucket
    );
    return notifications;
  },
  updateNotificationReceived: async (id) => {
    const notification = await API.getNotificationById(id);
    if (!notification)
      throw new Error(`Unable to find notification with ID ${id}`);
    const updatedNotification = { ...notification.value, hasReceived: true };
    return API.updateNotification(id, updatedNotification);
  },
  setNotificationRead: async (id) => {
    const notification = await API.getNotificationById(id);
    if (!notification)
      throw new Error(`Unable to find notification with ID ${id}`);
    const updatedNotification = {
      ...notification.value,
      hasRead: true,
      readNotificationOn: Date.now(),
    };
    return API.updateNotification(id, updatedNotification);
  },
  getNotifications: async (email, page, count) => {
    const offset = parseInt(page) * parseInt(count);
    const query = `SELECT * FROM apNotificationBucket WHERE userEmail = '${email}' OFFSET ${offset} LIMIT ${count}`;
    const notificationDocs = await couchbaseService.queryDB(query);
    const notifications = notificationDocs.map((doc) => doc.apNotificationBucket);
    return notifications;
  },
  getNotificationsCount: async (email) => {
    const query = `SELECT COUNT(*) from apNotificationBucket WHERE userEmail = '${email}'`;
    const countDoc = await couchbaseService.queryDB(query);
    return countDoc[0]["$1"];
  },
  updateNotificationActedOn: async (notificationId) => {
    const notification = await API.getNotificationById(notificationId);
    if (!notification)
      throw new Error(`Unable to find notification with ID ${notificationId}`);
    if (!notification.hasUserActedOnIt) {
      // only record if user hasn't acted on the notification before
      const updatedNotification = {
        ...notification.value,
        hasUserActedOnIt: true,
        actionOn: Date.now(),
      };
      const updated = await API.updateNotification(
        notificationId,
        updatedNotification
      );
      return updated;
    }
    return Promise.resolve();
  },
  getAllNotifications: async() => {
    const query = `SELECT * FROM apNotificationBucket`;
    const notificationDocs = await couchbaseService.queryDB(query);
    return notificationDocs.map(doc => doc.apNotificationBucket);
  }
};

module.exports = API;
