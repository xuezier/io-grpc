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
    this._middlewares = [];
    this.credentials = grpc.credentials.createInsecure();
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

    this.client = new rpc(arguments[1], this.credentials);
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
      handle(call, self._middlewares).then(function(flag) {
        if (flag) callback(call);
        else throw new Error(`run route method error ${name}`);
      }).catch(function(e) {
        console.error(e);
      });
    });

    call.on('end', function() {
      call.end();
    });

    call.write(data);
    call.end();
  }
}

module.exports = function createClientRpc() {
  return new clientRpc();
};
