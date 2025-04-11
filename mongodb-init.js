db = db.getSiblingDB('wa-bot');
db.createCollection('notifications');
db.notifications.createIndex({ timestamp: -1 });
db.notifications.createIndex({ status: 1 });
db.notifications.createIndex({ recipient: 1 });
