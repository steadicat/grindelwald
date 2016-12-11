(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.Grindelwald = global.Grindelwald || {})));
}(this, (function (exports) { 'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var called = {};
var stack = [];
var vide = Symbol('void');

var KeyNode = function KeyNode(node, key) {
  var _this = this;

  _classCallCheck(this, KeyNode);

  this.update = function () {
    _this.node.invalidate(_this.key);
  };

  this.node = node;
  this.key = key;
};

var Node = function () {
  function Node(id, fn, keyFn) {
    var _this2 = this;

    _classCallCheck(this, Node);

    this.toString = function () {
      return _this2.id;
    };

    this.isValid = function (key) {
      return _this2.lastResults[key] !== undefined;
    };

    this.invalidate = function () {
      var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : vide;

      if (!_this2.hasListeners(key)) {
        delete _this2.lastResults[key];
        return;
      }

      called[_this2.id] = (called[_this2.id] || 0) + 1;
      var args = _this2.keyArgs[key];
      var res = _this2.fn.apply(_this2, _toConsumableArray(args));
      if (res !== _this2.lastResults[key]) {
        _this2.lastResults[key] = res;
        [].concat(_toConsumableArray(_this2.listeners[key])).forEach(function (listener) {
          return listener(res);
        });
      }
    };

    this.call = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var key = _this2.keyFn.apply(_this2, args);
      if (stack[0] && newSubscriptions.get(stack[0])) {
        newSubscriptions.get(stack[0]).add(_this2.keyNode(key));
      }
      if (_this2.isValid(key)) {
        return _this2.lastResults[key];
      }
      called[_this2.id] = (called[_this2.id] || 0) + 1;
      _this2.keyArgs[key] = args;
      var res = autosubscribe(_this2.keyNode(key).update, function () {
        return _this2.fn.apply(_this2, args);
      });
      _this2.lastResults[key] = res;
      return res;
    };

    this.id = 'reactive(' + id + ')';
    this.fn = fn;
    this.keyFn = keyFn || function () {
      return vide;
    };
    this.keyNodes = {};
    this.keyArgs = {};
    this.lastResults = {};
    this.listeners = {};
  }

  _createClass(Node, [{
    key: 'subscribe',
    value: function subscribe(listener) {
      var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : vide;

      this.listeners[key] || (this.listeners[key] = new Set());
      this.listeners[key].add(listener);
    }
  }, {
    key: 'unsubscribe',
    value: function unsubscribe(listener) {
      var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : vide;

      if (!this.listeners[key]) return;
      this.listeners[key].delete(listener);
    }
  }, {
    key: 'hasListeners',
    value: function hasListeners(key) {
      return this.listeners[key] && this.listeners[key].size;
    }
  }, {
    key: 'keyNode',
    value: function keyNode(key) {
      if (this.keyNodes[key]) return this.keyNodes[key];
      this.keyNodes[key] = new KeyNode(this, key);
      return this.keyNodes[key];
    }
  }]);

  return Node;
}();

var nextID = 0;
function reactive(fn, keyFn) {
  var node = new Node(nextID++, fn, keyFn);
  node.call.toString = node.toString;
  node.call.node = node;
  node.call.invalidate = node.invalidate;
  return node.call;
}

var subscriptions = new Map();
var newSubscriptions = new Map();

function subtract(a, b) {
  return [].concat(_toConsumableArray(a)).filter(function (x) {
    return !b.has(x);
  });
}

function autosubscribe(listener, fn) {
  subscriptions.has(listener) || subscriptions.set(listener, new Set());
  newSubscriptions.has(listener) || newSubscriptions.set(listener, new Set());
  stack.unshift(listener);
  var res = fn();
  stack.shift();
  var newSubs = newSubscriptions.get(listener);
  var oldSubs = subscriptions.get(listener);
  var toSubscribe = subtract(newSubs, oldSubs);
  var toUnsubscribe = subtract(oldSubs, newSubs);
  toSubscribe.forEach(function (keyNode) {
    return keyNode.node.subscribe(listener, keyNode.key);
  });
  toUnsubscribe.forEach(function (keyNode) {
    return keyNode.node.unsubscribe(listener, keyNode.key);
  });
  subscriptions.set(listener, newSubs);
  newSubscriptions.delete(listener);
  return res;
}

exports.reactive = reactive;
exports.autosubscribe = autosubscribe;

Object.defineProperty(exports, '__esModule', { value: true });

})));
