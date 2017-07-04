'use strict';
const _ = require('../utils/utils');
const handle = require('../utils/handle');
const grpc = require('grpc');
const eventEmitter = require('events');

class clientRpc extends eventEmitter {
  constructor() {
    super();
    this.setMaxListeners(1000);
    this.rpc = null;
    this.client = null;
    this._routes = {};
    this._middlewares = [];

    this.credentials = grpc.credentials;
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

  decorate(rpc) {
    this.rpc = rpc;

    this.client = new rpc(...Array.prototype.slice.call(arguments, 1));
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
