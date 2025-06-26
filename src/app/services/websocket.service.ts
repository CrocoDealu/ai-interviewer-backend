@@ .. @@
     this.stompClient = new Client({
       webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
       debug: (str) => {
-        console.log('STOMP: ' + str);
+        console.warn('STOMP: ' + str);
       },
       reconnectDelay: 5000,
       heartbeatIncoming: 4000,
@@ .. @@
     });
 
     this.stompClient.onConnect = (frame) => {
-      console.log('Connected: ' + frame);
+      console.warn('Connected: ' + frame);
       this.subscribeToGameUpdates();
     };
 
@@ .. @@
     this.stompClient.subscribe('/topic/game-updates', (message) => {
       const gameUpdate = JSON.parse(message.body);
       this.gameUpdateSubject.next(gameUpdate);
-      console.log('Received game update:', gameUpdate);
+      console.warn('Received game update:', gameUpdate);
     });
   }