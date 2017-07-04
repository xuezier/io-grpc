'use strict';
module.exports = {
  typeof(o) {
    return Object.prototype.toString.call(o).replace(/^\[\w+\s|\]$/g, '').toLowerCase();
  },
  max(arr) {
    let sortRule = (a, b) => a - b;
    if (this.typeof(arr) === 'array') {
      return arr.sort(sortRule).pop();
    }
    let sortArr = Array.prototype.sort.call(arguments, sortRule);
    return Array.prototype.pop.call(sortArr);
  },
  min(arr) {
    let sortRule = (a, b) => a - b;
    if (this.typeof(arr) === 'array') {
      return arr.sort(sortRule)[0];
    }
    return Array.prototype.call(arguments, sortRule)[0];
  },
  each(o, fn) {
    if (this.typeof(o) === 'array') {
      return o.forEach(fn);
    }
    if (this.typeof(o) === 'object') {
      for (let key in o) {
        fn(o[key], key);
      }
    }
  }
};
