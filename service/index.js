'use strice';
const _ = require('../utils/utils');
const handle = require('../utils/handle');
const createProxyProperty = require('../utils/proxy');

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
    this._service = createProxyProperty();
    this._routes = createProxyProperty();

    this._serviceMiddlewares = {};
    this._serviceErrorMiddlewares = {};

    this._middlewares = [];
    this._errorMiddlewares = [];

    this._credentials = grpc.ServerCredentials.createInsecure();
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
    this._credentials = grpc.ServerCredentials.createSsl(fs.readFileSync(params.ca), [{
      cert_chain: fs.readFileSync(params.cert),
      private_key: fs.readFileSync(params.key)
    }], true);
  }

  bind() {
    var server = new grpc.Server();
    for (let rpc in this._rpc) {
      server.addService(this._rpc[rpc].service, this._service[rpc] ? this._service[rpc].all() : {});
    }
    server.bind.apply(server, [arguments[0], this._credentials]);
    server.start();
    return server;
  }

  /**
   * add public route middleware
   * @param {Function} fn middleware method withe params stream for call & next middleware for next
   */
  use(fn) {
    let argLength = arguments.length;
    if (argLength === 1) {
      if (_.typeof(fn) === 'function') {
        let _argumentsLength = fn.length;
        if (_argumentsLength === 2) {
          this._middlewares.push(fn);
        } else if (_argumentsLength === 1 || _argumentsLength === 3) {
          this._errorMiddlewares.push(fn);
        } else {
          console.warn('middleware function max arguments length is 3');
        }
      } else {
        throw new Error('middleware must be an function');
      }
    } else {
      let name = arguments[0];
      fn = arguments[1];
      let rpc = name.split('/').shift();
      let service_name = name.slice(rpc.length + 1);

      if (!service_name) throw new Error(`service name must a string like rpc_name/service_name, but got ${name}`);

      if (_.typeof(fn) === 'function') {
        let _argumentsLength = fn.length;
        if (_argumentsLength === 2) {
          if (!this._serviceMiddlewares[rpc]) this._serviceMiddlewares[rpc] = {};
          if (!this._serviceMiddlewares[rpc][service_name]) this._serviceMiddlewares[rpc][service_name] = [];

          this._serviceMiddlewares[rpc][service_name].push(fn);
        } else if (_argumentsLength === 1 || _argumentsLength === 3) {
          if (!this._serviceErrorMiddlewares[rpc]) this._serviceErrorMiddlewares[rpc] = {};
          if (!this._serviceErrorMiddlewares[rpc][service_name]) this._serviceErrorMiddlewares[rpc][service_name] = [];

          this._serviceErrorMiddlewares[rpc][service_name].push(fn);
        } else {
          console.warn('middleware function max arguments length is 3');
        }
      } else {
        throw new Error('middleware must be an function');
      }
    }
  }

  _addService(name) {
    let self = this;

    let rpc = name.split('/').shift();
    let service_name = name.slice(rpc.length + 1);

    if (!service_name) throw new Error(`service name ${name} is not allowed`);

    if (!self._service[rpc]) self._service.setItem(rpc, createProxyProperty());

    if (self._service[rpc].hasOwnProperty(service_name)) {
      throw new Error(`service name ${name} has used`);
    }

    return { rpc, service_name };
  }

  _createService({ rpc, service_name, call }, middlewares, callback) {
    let self = this;
    let addArgs = arguments;

    let _routeMiddlewares;
    let _middlewares = [].concat(self._middlewares);

    let _serviceMiddlewares;
    if (self._serviceMiddlewares[rpc]) {
      _serviceMiddlewares = self._serviceMiddlewares[rpc][service_name];
    }
    if (_.typeof(middlewares) === 'array')
      _routeMiddlewares = _middlewares.concat(middlewares);
    else if (_.typeof(middlewares) === 'function' && callback) {
      let length = addArgs.length;
      _routeMiddlewares = _middlewares.concat(Array.prototype.slice.call(addArgs, 2, length - 1));
    } else if (!callback) {
      _routeMiddlewares = _middlewares;
      callback = middlewares;
    }

    if (_serviceMiddlewares) _routeMiddlewares = _routeMiddlewares.concat(_serviceMiddlewares);

    _routeMiddlewares.push(callback);

    call._middlewares = _routeMiddlewares;
  }

  _addServiceErrorHandler({ rpc, service_name }, call) {
    let _errorStacks = [].concat(this._errorMiddlewares);

    let _serviceErrorStacks;
    if (this._serviceErrorMiddlewares[rpc]) {
      _serviceErrorStacks = this._serviceErrorMiddlewares[rpc][service_name];
    }

    if (_serviceErrorStacks) _errorStacks = _errorStacks.concat(_serviceErrorStacks);
    call._errorStacks = _errorStacks;
  }

  addRoute(name, middlewares, callback) {
    let self = this;
    let { rpc, service_name } = self._addService.apply(self, arguments);
    console.log(rpc, service_name);
    let addArgs = arguments;

    self._service[rpc].setItem(service_name, function(call) {
      self._createService.apply(self, [{ rpc, service_name, call }].concat(Array.prototype.slice.call(addArgs, 1)));

      let _eventId = 1,
        _dataId = 0;
      call._routeEmitter = new eventEmitter();
      call._routeEmitter.setMaxListeners(1000);

      let incoming;
      call.on('data', function(chunk) {
        incoming = chunk;
        call.body = incoming;

        self._addServiceErrorHandler({ rpc, service_name }, call);
        handle(call);

        call._routeEmitter.emit(_dataId++, call);
      });

      call._writeRoute = function(data, cb) {
        console.log(_eventId, 'e');
        call._routeEmitter.once(_eventId++, cb);
        call.write(data);
      };

      if (!self._routes[rpc]) {
        self._routes.setItem(rpc, createProxyProperty());
      }
      self._routes[rpc].setItem(service_name, call, true);
    });
  }

  route(name, data, callback) {
    let self = this;
    if (_.typeof(data) === 'function') {
      callback = data;
    }
    let rpc = name.split('/').shift();
    let service_name = name.slice(rpc.length + 1);

    self._routes[rpc][service_name]._writeRoute(data, callback);
  }

  _handleError(error) {
    if (_.typeof(error) === 'string')
      console.error(new Error(error));
    console.error(error);
  }

  /**
   * add route method
   * @param {String} name route name
   * @param {Array|Function} middlewares
   * @param {Function|Null} callback
   */
  addService(name, middlewares, callback) {
    let self = this;
    let { rpc, service_name } = self._addService.apply(self, arguments);
    let addArgs = arguments;

    self._service[rpc].setItem(service_name, function(call) {
      self._createService.apply(self, [{ rpc, service_name, call }].concat(Array.prototype.slice.call(addArgs, 1)));
      let incoming;
      call.on('data', function(chunk) {
        incoming = chunk;
        call.body = incoming;
        self._addServiceErrorHandler({ rpc, service_name }, call);
        handle(call);
      });

      call.on('end', function() {
        call.end();
      });

      call.on('error', function(e) {
        console.error(e);
      });
    });
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
