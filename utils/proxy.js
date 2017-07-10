'use strict';
module.exports = function createProxy(name) {
  var o = {};

  var proxy = new Proxy({}, {
    set: function() {
      return console.error(`object${name?' '+name+' ':' '}read only`);
    },
    get: function(target, name) {
      if (name in target) return target[name];
      return name in o ? o[name] : undefined;
    },
  });

  Object.defineProperty(proxy, 'setItem', {
    value: function(name, value, configurable) {
      if (arguments.length === 1) return console.log('value must be a param can not ignore');
      if (configurable) {
        Object.defineProperty(o, name, {
          value,
          writable: configurable ? true : false,
          configurable
        });
      } else {
        name in o ? console.error('object value can not defined twice') : o[name] = value;
      }
      return value;
    },
    writable: false,
    configurable: false,
  });

  Object.defineProperty(proxy, 'hasOwnProperty', {
    value: function(prop) {
      return prop in o;
    },
    writable: false,
    configurable: false,
  });

  Object.defineProperty(proxy, 'all', {
    value: function() {
      return new Object(o);
    },
    writable: false,
    configurable: false,
  });

  return proxy;
};
