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
```protobuf
syntax = "proto3";

option java_multiple_files = true;
option java_package= "io.grpc.myserver.route";
option objc_class_prefix = "RTG";

package route;

service Route {
  rpc Chat(stream Message) returns (stream routeMessage) {}
  rpc GetChat(stream Message) returns (stream routeMessage) {}
  rpc Trans (stream Message) returns (stream routeMessage) {}
}

message TransMessage {
  string name = 1;
  int32 age = 2;
  bytes birthday = 3;
}

message Message {
  string content = 1;
}

service Test {
  rpc Chat(stream Message) returns (stream routeMessage) {}
  rpc GetChat(stream GetMessage) returns (stream routeMessage) {}
}

message GetMessage {
  string route = 1;
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


serviceRpc.addService('route/chat', function(call) {
  console.log(call.body);
  call.write('i am xuezi');
});


serviceRpc.addService('test/getChat', function(call) {
  console.log(call.body, 1);
  serviceRpc.route(call.body.route, { content: 'im xuezi trans' }, function(recall) {
    let body = recall.body;
    console.log(body, 2);
    call.write(body);
  });
});

serviceRpc.addService('test/chat', function(call) {
  console.log(call.body);
  call.write('i am xuezi11');
});
serviceRpc.addRoute('route/trans', function(call) {
  console.log(call.body, 'trans');
});

serviceRpc.decorate(route);

serviceRpc.addTLS({
  ca: __dirname + '/ca.crt',
  cert: __dirname + '/server.crt',
  key: __dirname + '/server.key'
});

var server = serviceRpc.bind('0.0.0.0:5052');
console.log('rpc server start at:', '0.0.0.0:5052');
```

## build client
```javascript
var createClient = require('./io-grpc').createClientRpc;
var clientRpc = createClient();
var express = require('express');
var app = express();
let route = clientRpc.load(__dirname + '/grpc.service.proto').route;
clientRpc.addAuth({
  ca: __dirname + '/ca.crt',
  cert: __dirname + '/client.crt',
  key: __dirname + '/client.key'
});
clientRpc.decorate(route.Route, 'localhost:5052');

clientRpc.route('chat', { content: 'i am gaubee' }, function(call) {
  console.log(call.body);
});

clientRpc.addService('trans', function(call) {
  console.log(call.body, 'from rote');
  call.write({ content: 'i am gaubee' });
});

app.listen(2222);
```

## route client
```javascript
var createClient = require('./io-grpc').createClientRpc;
var clientRpc = createClient();

let route = clientRpc.load(__dirname + '/grpc.service.proto').route;
clientRpc.addAuth({
  ca: __dirname + '/ca.crt',
  cert: __dirname + '/client.crt',
  key: __dirname + '/client.key'
});
clientRpc.decorate(route.Test, 'localhost:5052');

clientRpc.route('chat', { content: 'i am chaos' }, function(call) {
  console.log(call.body);
});

clientRpc.route('getChat', { route: 'route/trans' }, function(call) {
  console.log(call.body);
});
```


[npm-image]: https://img.shields.io/npm/v/io-grpc.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/io-grpc