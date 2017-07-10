'use strict';

/**
 * run middlewares stacks
 * @author xuezi
 * @param {Object} call
 * @param {Array} stacks
 * @return {Promise}
 */
function handle(call, stacks) {
  var index = 0;

  var next = function() {
    var handler = stacks[index++];
    if (!handler) return false;
    try {
      handler(call, next);
    } catch (e) {
      return e;
    }
  };

  return next();
}

module.exports = handle;
