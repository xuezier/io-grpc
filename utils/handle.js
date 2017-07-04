'use strict';

/**
 * run middlewares stacks
 * @author xuezi
 * @param {Object} call
 * @param {Array} stacks
 * @return {Promise}
 */
function handle(call, stacks) {
  return new Promise(function(resolve, reject) {
    var index = 0;

    function next() {
      var handler = stacks[index++];
      if (!handler)
        return resolve(true);
      try {
        handler(call, next);
      } catch (e) {
        return reject(e);
      }
    }
    next();
  });
}

module.exports = handle;
