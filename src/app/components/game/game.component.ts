@@ .. @@
   private initializeGrid() {
     const config = this.game.configuratie.config.split(' ');
-    console.log('Config array:', config);
-    console.log('Config length:', config.length);
+    console.warn('Config array:', config);
+    console.warn('Config length:', config.length);
     this.grid = [];
     for (let i = 0; i < 3; i++) {
       this.grid[i] = [];
-      for (let j = 0; j < 4; j++) {
-        this.grid[i][j] = config[i * 4 + j];
+      for (let j = 0; j < 3; j++) {
+        this.grid[i][j] = config[i * 3 + j];
       }
     }
-    console.log('Grid after initialization:', this.grid);
-    console.log('Grid dimensions:', this.grid.length + 'x' + (this.grid[0] ? this.grid[0].length : 0));
+    console.warn('Grid after initialization:', this.grid);
+    console.warn('Grid dimensions:', this.grid.length + 'x' + (this.grid[0] ? this.grid[0].length : 0));
   }
 
   loadScoreboard() {
@@ .. @@
     if (this.gameEnded) {
       return;
     }
-    console.log(this.grid);
+    console.warn('Current grid state:', this.grid);
+    console.warn('Making move at position:', row, col);
     const duration = (Date.now() - this.startTime) / 1000;
 
     this.gameService.move(
@@ .. @@
           default:
-            console.log("response", response);
+            console.warn("Move response:", response);
             this.moves += 1;
             this.gameMessage = `Move successful! Total moves: ${this.moves}`;
             break;
@@ .. @@
     this.wsSubscription = this.webSocketService.gameUpdates$.subscribe(
       update => {
         if (update) {
-          console.log('Received game update:', update);
+          console.warn('Received game update:', update);
           this.loadScoreboard();
 
           if (update.username === this.username) {