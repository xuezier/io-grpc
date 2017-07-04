'use strice';
const _ = require('../utils/utils');
const handle = require('../utils/handle');

const grpc = require('grpc');
const eventEmitter = require('events');

var _serviceRpc;

class serviceRpc extends eventEmitter {
  /**
   * Creates an instance of serviceRpc.
   * @param {Object} params
   * @param {Boolean} params.strict
   * @memberof serviceRpc
   */
  constructor(params) {
    super();
    this.setMaxListeners(1000);
    console.log(1);
    this.rpc = null;
    this.strict = params.strict || false;

    this._service = {};
    this._middlewares = [];

    this.ServerCredentials = grpc.ServerCredentials;
  }

  /**
   * load proto file
   *
   * @param {String} path
   * @returns
   * @memberof serviceRpc
   */
  load(path) {
    return grpc.load.apply(grpc, arguments);
  }

  decorate(rpc) {
    this.rpc = rpc;
  }

  bind() {
    var server = new grpc.Server();
    server.addService(this.rpc.service, this._service);
    server.bind.apply(server, arguments);
    server.start();
    console.log('grpc server start at:', arguments[0]);
  }

  /**
   * add public route middleware
   * @param {Function} fn middleware method withe params stream for call & next middleware for next
   */
  use(fn) {
    if (_.typeof(fn) === 'function') {
      this._middlewares.push(fn);
    }
  }

  /**
   * add route method
   * @param {String} name route name
   * @param {Array|Function} middlewares
   * @param {Function|Null} callback
   */
  addService(name, middlewares, callback) {
    let self = this;

    if (self._service.hasOwnProperty(name)) {
      throw new Error(`service name ${name} has used`);
    }

    let addArgs = arguments;

    self._service[name] = function(call) {
      let incoming;

      let _routeMiddlewares;

      if (_.typeof(middlewares) === 'array')
        _routeMiddlewares = self._middlewares.concat(middlewares);
      else if (_.typeof(middlewares) === 'function' && callback) {
        let length = addArgs.length;
        _routeMiddlewares = self._middlewares.concat(Array.prototype.slice.call(addArgs, 1, length - 1));
      } else if (!callback) {
        _routeMiddlewares = self._middlewares;
        callback = middlewares;
      }

      call.on('data', function(chunk) {
        incoming = chunk;
        call.body = incoming;


        handle(call, _routeMiddlewares).then(function(flag) {
          if (flag) callback(call);
          else throw new Error('run handle middleware error, please check code');
        }).catch(function(e) {
          console.error(e);
        });
      });

      call.on('end', function() {
        call.end();
      });
    };

  }
}


/**
 * @param {Object} params
 * @param {Boolean} params.strict
 * @return {serviceRpc}
 */
module.exports = function createServiceRpc(params) {
  if (!_serviceRpc) {
    _serviceRpc = new serviceRpc(params || {});
  }
  return _serviceRpc;
};
