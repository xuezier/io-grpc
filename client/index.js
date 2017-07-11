'use strict';
const _ = require('../utils/utils');
const handle = require('../utils/handle');

const grpc = require('grpc');
const eventEmitter = require('events');
const fs = require('fs');

class clientRpc extends eventEmitter {
  constructor() {
    super();
    this.setMaxListeners(1000);
    this.rpc = null;
    this.client = null;
    this._routes = {};
    this._service = {};
    this._middlewares = [];
    this.credentials = grpc.credentials.createInsecure();
    this._errorFn = [];
    this._reconnect_count = 10;
    this._reconnect_delay = 5000;
  }

  /**
   * load proto file
   * @param {String} path
   * @returns
   * @memberof clientRpc
   */
  load(path) {
    return grpc.load.apply(grpc, arguments);
  }

  /**
   * add tls auth to connect service
   *
   * @param {Object} params
   * @param {String} params.ca    the path of ca file
   * @param {String} params.cert  the path of cert file
   * @param {String} params.key   the path of key file
   * @memberof clientRpc
   */
  addAuth(params) {
    this.credentials = grpc.credentials.createSsl(
      fs.readFileSync(params.ca),
      fs.readFileSync(params.key),
      fs.readFileSync(params.cert)
    );
  }

  decorate(rpc) {
    this.rpc = rpc;

    var client = new rpc(arguments[1], this.credentials);
    console.log(client);
    this.client = client;
  }

  /**
   * add route middleware
   *
   * @param {any} fn
   * @memberof clientRpc
   */
  use(fn) {
    if (_.typeof(fn) === 'function') {
      this._middlewares.push(fn);
    }
  }

  route(name, data, callback) {
    let self = this;

    if (_.typeof(data) === 'function') callback = data;

    var call = self.client[name]();

    call.on('data', function(chunk) {
      call.body = chunk;

      let err = handle(call, self._middlewares);
      if (err) return console.error(err);
      callback(call);
      call.end();
    });

    call.on('end', function() {
      call.end();
    });
    call.write(data);
  }

  _addService(name, reconnect) {
    let self = this;
    if (this._service.hasOwnProperty(name) && !reconnect) throw new Error(`service ${name} has been declared`);

    var call = self.client[name]();
    this._service[name] = call;
    call.write({});
    return call;
  }

  _addServiceCall(call, callback) {
    let self = this;

    call.on('data', function(chunk) {
      call.body = chunk;
      let _middlewares = [].concat(self._middlewares);
      let err = handle(call, _middlewares);
      if (err) return console.log(err);
      callback(call);
    });

    call.on('end', function() {
      console.log(`call ${name} end`);
    });
  }

  _handleCallError(name, call, callback) {
    let self = this;

    let _reconnect_count = 0;
    let _reconnect = true;
    call.on('error', function(e) {
      if (call.finished) {
        let _ti = setInterval(function() {
          if (_reconnect_count < self._reconnect_count) {
            try {
              console.log(e);
              let recall = self._addService(name, _reconnect);
              if (recall) {
                self._handleCallError(name, recall, callback);
                self._addServiceCall(recall, callback);
                clearInterval(_ti);
              }
            } catch (err) {
              console.log(err);
              _reconnect_count++;
            }
          } else {
            clearInterval(_ti);
            console.error(`connect ${name} failed`);
          }
        }, self._reconnect_delay);
      }
    });
  }

  addService(name, callback) {
    let self = this;

    let call = self._addService(name);

    self._addServiceCall(call, callback);

    self._handleCallError(name, call, callback);
  }

}

module.exports = function createClientRpc() {
  return new clientRpc();
};
