/**
 * Some Module Description
 * @module {
 *  bind    : true,
 *  execute : true,
 *  runtime : true
 * }
 */

@override('local')
export class Class {
  static get class() {
    var _this = this;
    delete this['class'];
    var _self = new _this(this);
    Object.defineProperty(Function.prototype, 'class', {
      configurable:true,
      get : function() {
        return new _this(this);
      }
    });
    Function.class;
    return _self;
  }
  constructor(constructor) {
    if (!(this instanceof Class)) {
      return new Class(constructor);
    } else if (typeof constructor == 'function') {
      var desc = Object.getOwnPropertyDescriptor(constructor, 'class');
      if (desc && desc.value instanceof Class) {
        return desc.value;
      } else {
        Object.defineProperty(this, 'constructor', {
          value: constructor
        });
        Object.defineProperty(constructor, 'class', {
          value: this
        });
        if(constructor['#initializer']){
          Object.defineProperty(this,'initializer',{
            value:constructor['#initializer']
          });
          delete constructor['#initializer'];
        }
        if(constructor['#decorators']){
          Object.defineProperty(this,'decorators',{
            configurable:true,
            writable:true,
            value:constructor['#decorators']
          });
          delete constructor['#decorators'];
        }
        if (typeof this.initialize == 'function') {
          this.initialize();
        }
      }
    } else {
      throw new Error('Invalid class constructor');
    }
  }
  get parent() {
    if (this.constructor == Object) {
      return Object.defineProperty(this, 'parent', {
        enumerable: false,
        configurable: false,
        value: false
      }).parent;
    } else {
      return Object.defineProperty(this, 'parent', {
        enumerable: false,
        configurable: true,
        value: Object.getPrototypeOf(this.constructor.prototype).constructor.class
      }).parent;
    }
  }
  get name() {
    return this.constructor.name;
  }
  initialize(scope,mod) {
    if(!scope) {
      var ms:Array = Object.getOwnPropertyNames(this.constructor);
      var mi:Array = Object.getOwnPropertyNames(this.constructor.prototype);
      ms.forEach(key=>Member.get(this, ':' + key));
      mi.forEach(key=>Member.get(this, '.' + key));
    }else{
      if(mod){
        Object.defineProperty(this,'module',{value:mod});
      }
      scope.supers = this.suppers.bind(this);
      scope.defaults = this.defaults.bind(this);
      var target = this;
      while(target){
        if(target.initializer){
          target.initializer(this);
        }
        target = target.parent;
      }
      this.decorate();
    }
  }
  member(key){
    if(this[key]){
      return this[key];
    }else
    if(this.parent){
      return this.parent[key];
    }
  }
  members(filter){
    return Object.keys(this)
        .map((key)=>{
          if(this[key] instanceof Member){
            if((typeof filter =='function')){
              if(filter(this[key])){
                return this[key]
              }
            }else{
              return this[key];
            }
          }
        })
        .filter((a)=>{
          return (a instanceof Member)
        });
  }
  decorate(){
    var ds = this.decorators;
    if(ds){
      this.decorators = ds['#'];
      delete ds['#'];
      var dm = Object.keys(ds);

      if(dm.length){
        dm.forEach(key=>{

          this.member(key).decorate(ds[key]);
        })
      }
      if(this.decorators){
        this.decorators = this.decorators.map(d=>{
          if(typeof d=='function'){
            return d(this);
          }else{
            return d;
          }
        })
      }
    }

  }
  defaults(target){
    var members;
    if(!target || target == this.constructor){
      target = this.constructor;
      members = this.members(m=>((m.type==Member.FIELD) && Member.isStatic(m)));
    }else{
      members = this.members(m=>((m.type==Member.FIELD) && !Member.isStatic(m)));
    }
    members.forEach(m=>{
      if(typeof m.value=='function'){
        Object.defineProperty(target,m.name,{
          enumerable:true,
          configurable:true,
          writable:true,
          value : m.value.call(target)
        })
      }
    })
  }
  suppers(target,...fields){
    var members,binding;
    if(target == this){
      members = [];
      if(this.parent.initializer){
        binding = this.parent.initializer.bind(target);
      }else{
        binding = function(){};
      }
    } else
    if(target == this.constructor){
      binding = this.parent.constructor.bind(target); // should be statics ?
      members = this.members(m=>(Member.isStatic(m) && fields.indexOf(m.name)>=0));
    }else
    if(target instanceof this.constructor){
      binding = this.parent.constructor.bind(target);
      members = this.members(m=>(!Member.isStatic(m) && fields.indexOf(m.name)>=0));
    }
    members.forEach(m=>m.parent.supers(binding,target));
    return binding;
  }
}

export class Member {
  constructor(owner:Class, key:String, def:Object) {
    this.owner      = owner;
    this.key        = key;
    this.modifiers  = 0;
    var d = Member.descriptor(owner,key);
    if(d){
      if(typeof d.value =='function'){
        this.type = Member.METHOD;
      }else{
        this.type = Member.FIELD;
      }
    }
    if(Member.isStatic(key)){
      this.modifiers |= Member.STATIC;
    }else{
      this.modifiers &= ~Member.STATIC;
    }
    if(this.owner.parent){
      var parent = this.owner.parent.member(this.key);
      if(parent){
        this.parent = parent;
        this.modifiers |= Member.EXTENDED;
      }else{
        delete this.parent;
        this.modifiers &= ~Member.EXTENDED;
      }
    }
    if(!def){
      this.modifiers |= Member.NATIVE;
      this.native  = Member.descriptor(owner,key);
      this.modifiers |= Member.modifiers(this.native);
      if(this.native.hasOwnProperty('value')){
        this.value = this.native.value;
      }else{
        if(this.native.hasOwnProperty('get')){
          this.getter = this.native.get;
        }
        if(this.native.hasOwnProperty('set')){
          this.setter = this.native.set;
        }
      }
      /*var def;
      if(this.native.value){
        def = this.native.value
      }*/
      //console.info(this.owner.name,this.key,this.native)
    }else{
      this.modifiers &= ~Member.NATIVE;
      this.update(def);
    }
  }
  static FIELD  = 'field';
  static METHOD = 'method';

  static HIDDEN = 1;
  static FINAL = 2;
  static CONSTANT = 4;
  static NATIVE = 8;
  static STATIC = 16;
  static EXTENDED = 32;

  static isField(member){
    return member.type==Member.FIELD;
  }
  static isMethod(member){
    return member.type==Member.METHOD;
  }
  static isHidden(member){
    return !!(member.modifiers&Member.HIDDEN);
  }
  static isFinal(member){
    return !!(member.modifiers&Member.FINAL);
  }
  static isConstant(member){
    return !!(member.modifiers&Member.CONSTANT);
  }
  static isStatic(member){
    if(typeof member=='string'){
      return member.charAt(0)==':';
    }else{
      return !!(member.modifiers&Member.STATIC);
    }
  }
  static isInstance(member){
    return !this.isStatic(member)
  }
  static isNative(member){
    return !!(member.modifiers&Member.NATIVE);
  }
  static isExtended(member){
    return !!(member.modifiers&Member.EXTENDED);
  }

  static get(owner:Class, key:String) {
    if (!owner[key]) {
      owner[key] = new Member(owner, key);
    }
    return owner[key];
  }
  static modifiers(descriptor){
    var modifiers = 0;
    if(!descriptor.enumerable){
      modifiers |= Member.HIDDEN;
    }else{
      modifiers &= ~Member.HIDDEN;
    }
    if(!descriptor.configurable){
      modifiers |= Member.FINAL;
    }else{
      modifiers &= ~Member.FINAL;
    }
    if(!descriptor.writable){
      modifiers |= Member.CONSTANT;
    }else{
      modifiers &= ~Member.CONSTANT;
    }
    return modifiers;
  }
  static descriptor(clazz,key){
    var name = key.substring(1);
    var isStatic = key.charAt(0)==':';
    return Object.getOwnPropertyDescriptor (
        isStatic
            ? clazz.constructor
            : clazz.constructor.prototype,
        name
    );
  }
  static holder(member){
    if(Member.isStatic(member)){
      return member.owner.constructor;
    }else{
      return member.owner.constructor.prototype;
    }
  }
  key:String;
  modifiers:Number;
  owner:Class;

  get name(){
    return this.key.substring(1);
  }
  supers(holder,target){
    if(this.type=Member.METHOD){
      Object.defineProperty(holder,this.name,{
        value:this.value.bind(target)
      })
    }else{
      var setter,getter,value,name=this.name;
      if(this.original){
        setter = this.original.set;
        getter = this.original.get;
        value  = this.original.value;
      }else{
        setter = this.setter;
        getter = this.getter;
        value  = this.value;
      }

      var proxy = {};
      if(getter || setter){
        if(getter){
          proxy.get = getter.bind(target);
        }
        if(setter){
          proxy.set = setter.bind(target);
        }
      }else{
        proxy.get = function getter(){
          return Object.defineProperty(this,name,{
            enumerable    : true,
            configurable  : true,
            writable      : true,
            value         : value
          })[name];
        }.bind(target);
        proxy.set = function setter(v){
          return Object.defineProperty(this,name,{
            enumerable:true,
            configurable:true,
            writable:true,
            value : v
          })[name];
        }.bind(target);
      }
      Object.defineProperty(holder,name,proxy);
    }
  }
  update(def){
    var d = {};
    if(typeof def=='function'){
      def = {'#f':def}
    }
    if(def.hasOwnProperty('#m')){
      this.modifiers |= def['#m'];
    }
    if(def.hasOwnProperty('#a')){
      this.decorators = def['#a'].filter(d=>!!d);
    }
    if(!Member.isHidden(this)){
      d.enumerable = true;
    }
    if(!Member.isFinal(this)){
      d.configurable = true;
    }
    if(!Member.isConstant(this)){
      d.writable = true;
    }
    if(def.hasOwnProperty('#f')){
      this.value = d.value = def['#f'];
    }else
    if(def.hasOwnProperty('#v') && (typeof def['#v']!='undefined')){
      this.value = d.value = def['#v'];
    }
    if(def.hasOwnProperty('#g')){
      delete d.value;
      delete d.writable;
      this.getter = d.get = def['#g'];
    }
    if(def.hasOwnProperty('#s')){
      delete d.value;
      delete d.writable;
      this.setter = d.set = def['#s'];
    }
    Object.defineProperty(Member.holder(this),this.name,d);
    this.modifiers |= Member.modifiers(Member.descriptor(this.owner,this.key));
  }
  decorate(decorators){
    this.decorators = decorators.map(d=>{
      if(typeof d=='function'){
        return d(this);
      }else{
        return d;
      }
    });
  }
  descriptor(d){
    if(d){
      Object.defineProperty(Member.holder(this),this.name,d);
    }
    return Member.descriptor(this.owner,this.key);
  }
}
export class Path {
  static SEP = '/';

  static isAbsolute(path:Path) {
    return path.charAt(0) == '/';
  }

  static dirname(path:Path) {
    var filename = Path.filename(path);
    if (filename.indexOf('.') > 0) {
      path = path.split(Path.SEP);
      path.pop();
      return path.join(Path.SEP);
    }
    return path;
  }

  static filename(path:String) {
    return path.split(Path.SEP).pop();
  }

  static rename(path:String, name, ext) {
    var dn = Path.dirname(path);
    var fn;
    if (ext) {
      if (name.charAt(0) == '.') {
        name = name.substring(1);
      }
      fn = Path.filename(path);
      fn = fn.split('.');
      fn.pop();
      fn.push(name);
      fn = fn.join('.');
    } else {
      fn = name;
    }
    return Path.resolve(dn, fn);
  }

  static normalize(path:Path) {
    if (!path || path === '/') {
      return '/';
    }
    var prepend = (path.charAt(0) == '/' || path.charAt(0) == '.');
    var target = [], src, scheme, parts, token;
    if (path.indexOf('://') > 0) {
      parts = path.split('://');
      scheme = parts[0];
      src = parts[1].split('/');
    } else {
      src = path.split('/');
    }
    for (var i = 0; i < src.length; ++i) {
      token = src[i];
      if (token === '..') {
        target.pop();
      } else if (token !== '' && token !== '.') {
        target.push(token);
      }
    }
    return (
      (scheme ? scheme + '://' : '') +
      (prepend ? '/' : '') +
      target.join('/').replace(/[\/]{2,}/g, '/')
    );
  }

  static resolve(...paths) {
    var current = paths.shift();
    paths.forEach(path=> {
      if (Path.isAbsolute(path)) {
        current = path;
      } else {
        current = Path.normalize(current + '/' + path)
      }
    });
    return current;
  }
}
export class Url {
  static parse(str) {
    return new Url(str);
  }
  static resolve(url,path){
    if(!(url instanceof Url)){
      url = new Url(url);
    }
    return new Url(url.toString()).update({
      pathname:Path.resolve(url.pathname,path)
    });
  }
  get href() {
    return this.protocol + '//'
      + (this.credentials ? this.credentials + '@' : '')
      + this.host
      + this.pathname
      + this.search
      + this.hash;
  }

  set href(v) {
    var i = v.indexOf('#');
    if (i > 0) {
      this.hash = v.substring(i);
      v = v.substring(0, i);
    }
    if (v.indexOf('/') == 0) {
      v = 'file://' + v;
    }
    i = v.indexOf('//');
    if (i > 0) {
      this.protocol = v.substring(0, i);
      v = v.substring(i + 2);
    }
    i = v.indexOf('?');
    if (i > 0) {
      this.search = v.substring(i);
      v = v.substring(0, i);
    }
    i = v.indexOf('/');
    if (i == 0 && this.protocol == 'file:') {
      this.pathname = v;
    } else if (i > 0) {
      this.host = v.substring(0, i);
      v = v.substring(i);
      this.pathname = v;
    } else {
      this.host = v;
    }
    // normalize host
  }

  get origin() {
    return this.protocol + '//' + this.host;
  }

  set origin(v) {
    var i = v.indexOf('//');
    if (i > 0) {
      this.protocol = v.substring(0, i);
      v = v.substring(i + 2);
    }
    i = v.indexOf('/');
    if (i > 0) {
      this.host = v.substring(0, i);
    }
  }

  get protocol() {
    return this.$.protocol;
  }

  set protocol(v) {
    this.$.protocol = v;
  }

  get credentials() {
    if (this.username || this.password) {
      return this.username + ':' + this.password;
    } else {
      return '';
    }
  }

  set credentials(v) {
    v = v.split(':');
    this.username = v.shift();
    if (v.length) {
      this.password = v.shift();
    }
  }

  get username() {
    return this.$.username || '';
  }

  set username(v) {
    this.$.username = v;
  }

  get password() {
    return this.$.password || '';
  }

  set password(v) {
    this.$.password = v;
  }

  get host() {
    if (this.port) {
      return this.hostname + ':' + this.port;
    } else {
      return this.hostname;
    }
  }

  set host(v) {
    if (v) {
      var host = v.split('@');
      if (host.length > 1) {
        this.credentials = host.shift();
      }
      host = host.shift().split(':');
      this.hostname = host.shift();
      this.port = host.shift();
    } else {
      delete this.$.host;
    }
  }

  get hostname() {
    return this.$.hostname || '';
  }

  set hostname(v) {
    this.$.hostname = v;
  }

  get port() {
    return this.$.port || '';
  }

  set port(v) {
    if (v) {
      this.$.port = parseInt(v);
    } else {
      delete this.$.port;
    }
  }

  get pathname() {
    return this.$.pathname || '/';
  }

  set pathname(v) {
    this.$.pathname = Path.normalize(v);
  }

  get filename() {
    return Path.filename(this.pathname);
  }

  set filename(v) {
    this.pathname = Path.resolve(this.pathname, '..', Path.filename(v));
  }

  get search() {
    var pairs = [];
    for (var i in this.query) {
      pairs.push(i + '=' + this.query[i]);
    }
    if (pairs.length) {
      return '?' + pairs.sort().join('&');
    } else {
      return '';
    }
  }

  set search(v) {
    if (v.indexOf('?') == 0) {
      this.query = v.substring(1);
    } else {
      this.query = v;
    }
  }

  get query() {
    return this.$.query || (this.$.query = {});
  }

  set query(v) {
    if (!this.$.query) {
      this.$.query = {};
    }
    v.split('&').forEach(pair=> {
      pair = pair.split('=');
      this.$.query[pair[0].trim()] = pair[1].trim();
    })
  }

  get hash() {
    return this.$.hash || '';
  }

  set hash(v) {
    this.$.hash = v;
  }

  constructor(url) {
    Object.defineProperty(this, '$', {value: {}});
    if (typeof url == 'string') {
      this.href = url;
    }
  }

  update(url) {
    if (typeof url == 'string') {
      url = new Url(url);
    }
    if (url.query) {
      for (var key in url.query) {
        this.query[key] = url.query[key];
      }
    }
    if (url.origin) {
      this.origin = url.origin
    }
    if (url.pathname) {
      this.pathname = Path.resolve(this.pathname, url.pathname);
    }
    if (url.hash) {
      this.hash = url.hash
    }
    return this;
  }

  resolve(path) {
    return Url.resolve(this,path);
  }

  inspect() {
    return {
      href: this.href,
      origin: this.origin,
      protocol: this.protocol,
      credentials: this.credentials,
      username: this.username,
      password: this.password,
      host: this.host,
      hostname: this.hostname,
      port: this.port,
      pathname: this.pathname,
      filename: this.filename,
      search: this.search,
      query: this.query,
      hash: this.hash
    };
  }

  toString() {
    return this.href;
  }

  toJSON() {
    return this.toString();
  }
}
export class Loader {
  static load(path) {
    switch (Asx.platform) {
      case Runtime.NODE     :
        return require('fs').readFileSync(Url.parse(path).pathname, 'utf8');
      //return VM.runInThisContext();
      case Runtime.BROWSER  :
        var request = new XMLHttpRequest();
        request.open('GET', path, false);
        request.send();
        if (request.status != 200) {
          throw new Error('File not found ' + path);
        }
        return request.responseText;
      //return eval();
    }
  }
}
@native
@override('local')
export class Module {

  static normalize(name){
    var id = name;
    id = id.replace(/^(.*)\.js$/, '$1');
    id = id.split('/').filter(p=>p.match(/^[A-Z0-9_\-]*$/i));
    if(id.length<2){
      throw new Error('Invalid Module Id '+name);
    } else
    if(id.length==2){
      id.push('index');
    }
    return id.join('/');
  }
  static paths(module){
    return [Asx.repository.resolve(Module.path(module))];
  }
  static path(module){
    return module.id+'.js';
  }
  prepare() {
    //var parts = this.id.split('/');
    //this.project = parts.shift();
    //this.group = parts.shift();
    //this.path = parts.join('/')+'.js';
    this.pending = true;
    if (!this.scope) {
      this.scope = {};
    }
  }
  load(parent) {
    var script,paths = Module.paths(this);
    for(var i=0,path;i<paths.length;i++){
      path = paths[i].toString();
      try {
        script = Loader.load(path)
        this.url = path;
        break;
      } catch (ex) {
        console.error(ex);
      }
    }
    if (script) {
      this.script = script;
      this.evaluate()
    } else {
      throw new Error('Module Not Available "' + this.id+'"',paths)
    }
  }
  evaluate() {
    switch (Runtime.Asx.platform) {
      case Runtime.NODE     :
        return require('vm').runInThisContext(this.script,new Url(this.url).pathname);
      case Runtime.BROWSER  :
        var Asx = Runtime.Asx;
        return eval(this.script+'\n//# sourceURL='+this.url.toString());
    }
  }
  require(path, targets) {
    console.info(path);
    try {

      if (path.charAt(0) == '.') {
        path = Path.resolve(Path.dirname(Module.path(this)), path);
      }
      var child = Module.get(path);
      if (child.pending) {
        if (Asx.platform == 'node' && child.id.indexOf('node/') == 0) {
          var exp;
          path = child.id.substring(5).replace(/^(.*)\/index$/, '$1')
          if (path.indexOf('binding/') == 0) {
            path = path.substring(8);
            exp = process.binding(path);
          } else {
            exp = Asx.require(path);
          }
          child.initialize(function () {
            return {
              execute: function () {
                return exp
              }
            }
          });
        } else {
          child.load(this);
        }
      }

      if (typeof targets == 'string') {
        if (targets == '*' && child.exports) {
          Object.keys(child.exports).forEach((k, n)=> {
            this.scope[k] = child.exports[k];
          })
        } else {
          this.scope[targets] = child.exports;
        }
      } else {
        if (targets['#']) {
          this.scope[targets['#']] = child.exports['#'] || child.exports;
          delete targets['#'];
        }
        Object.keys(targets).forEach(k=> {
          var v = targets[k];
          if (v == '*') {
            v = k;
          }
          this.scope[v] = child.exports[k]
        })
      }
      return child;
    }catch(ex){
      ex.message = "Module:"+this.id+' : '+ex.message;
      throw ex;
    }
    /*
     Module.get(path).load();
     console.info(Module.get(path));*/
  }
  doImports(imports) {
    if (this.imports) {
      Object.keys(this.imports).forEach(i=>this.require(i,this.imports[i]));
    }
    this.doExecute();
  }
  doExports(){
    delete this.pending;
    //delete this.exports;
    this.finalize();
  }

}
@native
@override('local')
export class Runtime {
  static NODE = 'node';
  static BROWSER = 'browser';

  static execute() {
    module.onComplete = ()=>{
      if(Asx.executable){
        var main = module.require(Asx.executable,'*');
        if(main.exports && (typeof main.exports.main=='function')){
          main.exports.main(['args']);
        }
      }
    }
  }

  get platform() {
    if (typeof process != 'undefined') {
      return Runtime.NODE;
    }
    if (typeof window != 'undefined') {
      return Runtime.BROWSER;
    }
  }
  get repository() {
    var url;
    switch (this.platform) {
      case Runtime.NODE     :
        url = new Url(__filename);
        break;
      case Runtime.BROWSER  :
        url = new Url(document.querySelector('script[main]').src);
        break;
    }
    return url.resolve('../../../');
  }
  get executable() {
    switch (this.platform) {
      case Runtime.NODE     :
        return process.argv[2];
      case Runtime.BROWSER  :
          var mainScript =document.querySelector('script[main]');
          if(mainScript){
              return mainScript.getAttribute('main');
          }
    }
  }
  get global(){
    return Runtime.global;
  }
  _(target,object){
    var hidden = target._;
    if(typeof hidden=='undefined'){
      if(!Object.getOwnPropertyDescriptor(target,'_')){
        hidden=Object.defineProperty(target,'_',{value:{}})._;
      }
    }
    if(object && hidden){
      Object.getOwnPropertyNames(object).forEach(k=>{
        Object.defineProperty(hidden,k,Object.getOwnPropertyDescriptor(object,k));
      })
    }
  }
}
@native
export class Object {
  static isObject(obj) {
    return typeof obj === 'object' && obj !== null
  }
}
@native
export class String {
  format(){
    var args = arguments;
    return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (curlyBrack, index) {
      return ((curlyBrack == "{{") ? "{" : ((curlyBrack == "}}") ? "}" : args[index]));
    });
  }
}

@native
export class Error {
  static toss(msg) {
    throw new Error(msg);
  }
}

Runtime.execute();
