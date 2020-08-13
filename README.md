# NOTIFICATION SERVICE

This service is incharge of handling any notifications for our console

## WORKFLOW

* The frontend application connects to the notification service using socket.io
* It sends the auth token of the user in the query parameter of the connection URL.
* If the token is authorized, a connection is established between the server and the client
* If there were any notifications received when the user wasn't connected, the pending notifications would be sent under the event `prevNotifications`.
* If the client is connected to the notification service and the notification service receives a notification, it is sent to the client in real time under `newNotification`.
* Any time a notification is received, the client sends an event `notificationReceived` with the `notificationId`. The notification is then marked as received by the client and is not sent again by `prevNotifications`. This is applicable for both `prevNotifications` and `newNotification` events.

* Any new notifications should be sent to the queue publisher API under the queue `NOTIFICATION`.

> Admin users are rejected from connecting to the service to make sure notification is only delivered to the owner.
---
## ARCHITECTURE
![Architecture Diagram](./screenshot.png?raw=true "Architecture")

---

## EVENTS

* `connect` : Called by socket.io to connect to the notification service. Requires `authToken` in query params.
* `prevNotifications` : Listened by client to get a list of previously unsent notifications.
* `newNotification` : Listened by client to get a new notification when connected 
* `notificationReceived` : Listened by server to mark a notification as received after client receives the notification. The client needs to send this event for every notification received.