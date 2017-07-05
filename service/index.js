'use strice';
const _ = require('../utils/utils');
const handle = require('../utils/handle');

const grpc = require('grpc');
const eventEmitter = require('events');
const fs = require('fs');

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
    this.strict = params.strict || false;

    this._rpc = {};
    this._service = {};
    this._middlewares = [];
    this.credentials = grpc.ServerCredentials.createInsecure();

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
    for (let key in rpc) {
      let rpc_name = key.toLowerCase();
      if (rpc[key].hasOwnProperty('service')) this._rpc[rpc_name] = rpc[key];
    }
  }

  /**
   * add tls auth
   *
   * @param {Object} params
   * @param {String} params.ca  the path of ca file
   * @param {String} params.cert the path of cert file
   * @param {String} params.key the path of key file
   * @memberof serviceRpc
   */
  addTLS(params) {
    this.credentials = grpc.ServerCredentials.createSsl(fs.readFileSync(params.ca), [{
      cert_chain: fs.readFileSync(params.cert),
      private_key: fs.readFileSync(params.key)
    }], true);
  }

  bind() {
    var server = new grpc.Server();
    for (let rpc in this._rpc) {
      server.addService(this._rpc[rpc].service, this._service[rpc] || {});
    }
    server.bind.apply(server, [arguments[0], this.credentials]);
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

    let rpc = name.split('/').shift();
    let service_name = name.slice(rpc.length + 1);

    if (!service_name) throw new Error(`service name ${name} is not allowed`);

    if (!self._service[rpc]) self._service[rpc] = {};

    if (self._service[rpc].hasOwnProperty(service_name)) {
      throw new Error(`service name ${name} has used`);
    }

    let addArgs = arguments;

    self._service[rpc][service_name] = function(call) {
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
