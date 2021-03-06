'use strict';
const process = require('process');
const events = new require('events');
const eventEmitter = new events();

const _ = require('./utils');
/**
 * run middlewares stacks
 * @author xuezi
 * @param {Object} call
 * @param {Array} stacks
 * @return {any}
 */
function handle(call) {
  var index = 0;

  var next = function(err) {
    if (err) {
      if (_.typeof(err) === 'string' || _.typeof(err) === 'number') err = new Error(err);
      return eventEmitter.emit('handleError', err, call);
    }

    var handler = call._middlewares[index++];
    if (!handler) return false;
    process.nextTick(function() {
      try {
        handler(call, next);
      } catch (e) {
        return eventEmitter.emit('handleError', e, call);
      }
    });
  };

  return next();
}

/**
 * run error middlewares stacks
 *
 * @param {Error} error
 * @param {Object} call
 * @param {Function[]} errorStacks
 * @returns {any}
 */
function _handleError(error, call) {
  var index = 0;

  /**
   * @param {Error} err
   */
  var next = function(err) {
    var handler = call._errorStacks[index++];
    if (!handler) return false;
    process.nextTick(function() {
      try {
        handler(err, call, next);
      } catch (e) {
        return eventEmitter.emit('defaultErrorHandler', e);
      }
    });
  };
  return next(error);
}


/**
 * default error handler
 *
 * @param {Error} error
 */
function _defaultErrorHandler(error) {
  console.error(error);
}

function _unhandledRejectionError(reason, p) {
  console.error(`Unhandled Rejection Error at Promise ${p}, reson: ${reason}`);
}

eventEmitter.on('handleError', _handleError);
eventEmitter.on('defaultError', _defaultErrorHandler);
process.on('unhandledRejection', _unhandledRejectionError);
module.exports = handle;
