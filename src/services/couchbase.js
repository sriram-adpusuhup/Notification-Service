/**
 * Created by Dhiraj on 3/2/2016.
 */
const couchbase = require("couchbase");
const Promise = require("bluebird");
const config = require("../../configs/config");
const connectedBuckets = {};

const cluster = new couchbase.Cluster("couchbase://" + config.COUCHBASE.HOST, {
  operation_timeout: 5000,
});

// RBAC (Role Based Access Control) Authentication,
// See https://docs.couchbase.com/server/5.1/security/security-rbac-user-management.html
cluster.authenticate(config.COUCHBASE.USERNAME, config.COUCHBASE.PASSWORD);

function connect(bucket) {
  return new Promise(function (resolve, reject) {
    if (connectedBuckets[bucket]) {
      resolve(connectedBuckets[bucket]);
      return;
    }

    connectedBuckets[bucket] = cluster.openBucket(bucket, function (err) {
      if (err) {
        reject(err);
        return;
      }
      connectedBuckets[bucket] = Promise.promisifyAll(connectedBuckets[bucket]);
      resolve(connectedBuckets[bucket]);
      return;
    });
  });
}

const API = {
  connectToBucket: function (bucketName) {
    return connect(bucketName);
  },
  connectToNotificationBucket: function () {
    return connect(config.COUCHBASE.BUCKET);
  },
  queryDB: function (query) {
    return API.connectToNotificationBucket().then(function (appBucket) {
      return appBucket.queryAsync(couchbase.N1qlQuery.fromString(query));
    });
  },
  getDoc: (docId) => {
    return API.connectToNotificationBucket().then((appBucket) =>
      appBucket.getAsync(docId)
    );
  },
  createDoc: (docId, json, option) => {
    return API.connectToNotificationBucket().then((appBucket) => {
      json.dateCreated = +new Date();
      return appBucket.insertAsync(docId, json, option);
    });
  },
  updateDoc: (docId, doc, cas) => {
    return API.connectToNotificationBucket().then((appBucket) => {
      if (cas) return appBucket.replaceAsync(docId, doc, { cas });
      return appBucket.upsertAsync(docId, doc);
    });
  },
  cluster,
};

module.exports = API;
