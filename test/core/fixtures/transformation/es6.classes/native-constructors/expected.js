"use strict";

var Foo = (function (_Array) {
  function Foo() {
    babelHelpers.classCallCheck(this, Foo);

    if (_Array != null) {
      var _this = new (babelHelpers.bind.apply(_Array, [null].concat(babelHelpers.slice.call(arguments))))();

      _this.__proto__ = Foo.prototype;
      return _this;
    }

    return _this;
  }

  babelHelpers.inherits(Foo, _Array);
  return Foo;
})(Array);

var Bar = (function (_Array2) {
  function Bar() {
    babelHelpers.classCallCheck(this, Bar);

    var _this2 = new _Array2();

    _this2.__proto__ = Bar.prototype;

    _this2.foo = "bar";
    return _this2;
  }

  babelHelpers.inherits(Bar, _Array2);
  return Bar;
})(Array);

var Baz = (function (_Array3) {
  function Baz() {
    babelHelpers.classCallCheck(this, Baz);

    var _this3 = new _Array3();

    _this3.__proto__ = Baz.prototype;

    (function () {
      return _this3;
    });
    return _this3;
  }

  babelHelpers.inherits(Baz, _Array3);
  return Baz;
})(Array);
