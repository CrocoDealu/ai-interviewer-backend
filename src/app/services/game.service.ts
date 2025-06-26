@@ .. @@
     const params = new HttpParams()
       .set('i', i.toString())
       .set('j', j.toString())
       .set('jocId', jocId.toString())
       .set('durata', durata.toString());
 
-    console.log("Making move request with params:", params.toString());
+    console.warn("Making move request with params:", params.toString());
     return this.http.put(
       `${this.apiUrl}/move/${username}`,
       {},
     )