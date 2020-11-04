module.exports = {
    PORT: 8081,
    ENV: 'production',
    JWT: {
        SALT: '6981EDF13FB48' // has to be same salt as in Geniee repo
    },
    COUCHBASE: {
        HOST: '127.0.0.1',
        USERNAME: 'Admin',
        PASSWORD: 'asd12345',
        BUCKET: 'apNotificationBucket'
    },
    ADMIN_TOKEN: 'cfeb4366194dfe458e7f416ab8dcf58f'
}