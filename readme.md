# IO-GRPC

an sample rpc-framework build with grpc for node.js. easy used, fast & high-performance.

## Service side
use for create service side.
### *load*
load proto file to generate service description

### *decorate*


## build proto
```java
syntax = "proto3";

option java_multiple_files = true;
option java_package= "io.grpc.myserver.route";
option objc_class_prefix = "RTG";

package route;

service Route {
  rpc Chat(stream Message) returns (stream routeMessage) {}
}

message Message {
  string content = 1;
}

message routeMessage {
  string content = 1;
}
```

## build service
```javascript
var createRpc = require('./io-grpc').createServiceRpc;

let serviceRpc = createRpc();
var route = serviceRpc.load(__dirname + '/grpc.service.proto').route;

serviceRpc.use(function(call, next) {
  console.log('middleware call :', call.body);
  next();
  console.log('end middleware');
});

serviceRpc.addService('chat', function(call) {
  console.log(call.body);
  call.write('i am xuezi');
});

serviceRpc.decorate(route.Route);


serviceRpc.bind('0.0.0.0:50052', serviceRpc.ServerCredentials.createInsecure());
```

## build client
```javascript
var createClient = require('./io-grpc').createClientRpc;
var clientRpc = createClient();

let route = clientRpc.load(__dirname + '/grpc.service.proto').route;
clientRpc.decorate(route.Route, 'localhost:50052', clientRpc.credentials.createInsecure());

clientRpc.route('chat', { content: 'i am gaubee' }, function(call) {
  console.log(call.body);
});

```