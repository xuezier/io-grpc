# IO-GRPC
[![NPM version][npm-image]][npm-url]

an sample rpc-framework build with grpc for node.js. easy used, fast & high-performance.

## Service side
for create service side.
### *load(protoFile)*
load proto file to generate service description

### *decorate(rpc)*
### *addTLS(serviceCertificates)*
### *bind(port)*
### *use(middlewareFn)*
### *addService(name,middlewares,callback(stream))*


## Client side
for create client side
### *load(protoFile)*
### *addAuth(clientCertificates)*
### *decorate(rpc)*
### *use(middlewareFn)*
### *route(name, data, callback)*

## build proto
```java
ssyntax = "proto3";

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

service Test {
  rpc Chat(stream Message) returns (stream routeMessage) {}
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

serviceRpc.addService('route/chat', function(call) {
  console.log(call.body);
  call.write('i am xuezi');
});

serviceRpc.addService('test/chat', function(call) {
  console.log(call.body);
  call.write('i am xuezi');
});

serviceRpc.decorate(route);

serviceRpc.addTLS({
  ca: __dirname + '/ca.crt',
  cert: __dirname + '/server.crt',
  key: __dirname + '/server.key'
});

serviceRpc.bind('0.0.0.0:50052');
```

## build client
```javascript
var createClient = require('./io-grpc').createClientRpc;
var clientRpc = createClient();

let route = clientRpc.load(__dirname + '/grpc.service.proto').route;
clientRpc.addAuth({
  ca: __dirname + '/ca.crt',
  cert: __dirname + '/client.crt',
  key: __dirname + '/client.key'
});
clientRpc.decorate(route.Route, 'localhost:50052');

clientRpc.route('chat', { content: 'i am gaubee' }, function(call) {
  console.log(call.body);
});
```


[npm-image]: https://img.shields.io/npm/v/io-grpc.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/io-grpc