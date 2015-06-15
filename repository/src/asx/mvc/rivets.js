import {Watcher} from './watcher';
export class Util {
    static bindEvent(el, event, handler){
        if('addEventListener' in window) {
            return el.addEventListener(event, handler, false);
        }else{
            return el.attachEvent('on' + event, handler);
        }
    }
    static unbindEvent(el, event, handler){
        if('addEventListener' in window) {
            return el.removeEventListener(event, handler, false);
        }else{
            return el.detachEvent('on' + event, handler);
        }
    }
    static getInputValue(el) {
        var o, _i, _len, _results;
        if (el.type === 'checkbox') {
            return el.checked;
        } else if (el.type === 'select-multiple') {
            _results = [];
            for (_i = 0, _len = el.length; _i < _len; _i++) {
                o = el[_i];
                if (o.selected) {
                    _results.push(o.value);
                }
            }
            return _results;
        } else {
            return el.value;
        }
    }
}
export class TypeParser {
    static types = {
        primitive   : 0,
        keypath     : 1
    }
    static parse(string) {
        if (/^'.*'$|^".*"$/.test(string)) {
            return {
                type: TypeParser.types.primitive,
                value: string.slice(1, -1)
            };
        } else if (string === 'true') {
            return {
                type: TypeParser.types.primitive,
                value: true
            };
        } else if (string === 'false') {
            return {
                type: TypeParser.types.primitive,
                value: false
            };
        } else if (string === 'null') {
            return {
                type: TypeParser.types.primitive,
                value: null
            };
        } else if (string === 'undefined') {
            return {
                type: TypeParser.types.primitive,
                value: void 0
            };
        } else if (isNaN(Number(string)) === false) {
            return {
                type: TypeParser.types.primitive,
                value: Number(string)
            };
        } else {
            return {
                type: TypeParser.types.keypath,
                value: string
            };
        }
    }
}
export class TextTemplateParser {
    static types = {
        text: 0,
        binding: 1
    }
    static parse(template, delimiters) {
        var index, lastIndex, lastToken, length, substring, tokens, value;
        tokens = [];
        length = template.length;
        index = 0;
        lastIndex = 0;
        while (lastIndex < length) {
            index = template.indexOf(delimiters[0], lastIndex);
            if (index < 0) {
                tokens.push({
                    type: TextTemplateParser.types.text,
                    value: template.slice(lastIndex)
                });
                break;
            } else {
                if (index > 0 && lastIndex < index) {
                    tokens.push({
                        type: TextTemplateParser.types.text,
                        value: template.slice(lastIndex, index)
                    });
                }
                lastIndex = index + delimiters[0].length;
                index = template.indexOf(delimiters[1], lastIndex);
                if (index < 0) {
                    substring = template.slice(lastIndex - delimiters[1].length);
                    lastToken = tokens[tokens.length - 1];
                    if ((lastToken != null ? lastToken.type : void 0) === TextTemplateParser.types.text) {
                        lastToken.value += substring;
                    } else {
                        tokens.push({
                            type: TextTemplateParser.types.text,
                            value: substring
                        });
                    }
                    break;
                }
                value = template.slice(lastIndex, index).trim();
                tokens.push({
                    type: TextTemplateParser.types.binding,
                    value: value
                });
                lastIndex = index + delimiters[1].length;
            }
        }
        return tokens;
    }
}
export class View {
    constructor(els, models, options) {
        var k, option, v, _base, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4;
        this.els = els;
        this.models = models;
        if (options == null) {
            options = {};
        }
        if (!(this.els.jquery || this.els instanceof Array)) {
            this.els = [this.els];
        }
        _ref = ['binders', 'formatters', 'components', 'adapters'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            option = _ref[_i];
            this[option] = {};
            if (options[option]) {
                _ref1 = options[option];
                for (k in _ref1) {
                    v = _ref1[k];
                    this[option][k] = v;
                }
            }
            _ref2 = Rivets[option];
            for (k in _ref2) {
                v = _ref2[k];
                if ((_base = this[option])[k] == null) {
                    _base[k] = v;
                }
            }
        }
        _ref3 = ['prefix', 'templateDelimiters', 'rootInterface', 'preloadData', 'handler'];
        for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
            option = _ref3[_j];
            this[option] = (_ref4 = options[option]) != null ? _ref4 : Rivets[option];
        }
        [
            'options',
            'bindingRegExp',
            'buildBinding',
            'build',
            'traverse',
            'select',
            'bind',
            'unbind',
            'sync',
            'publish',
            'update'
        ].forEach(m=>{this[m]=this[m].bind(this);});
        this.build();
    }
    options() {
        var option, options, _i, _len, _ref;
        options = {};
        _ref = ['binders', 'formatters', 'components', 'adapters','prefix', 'templateDelimiters', 'rootInterface', 'preloadData', 'handler'];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            option = _ref[_i];
            options[option] = this[option];
        }
        return options;
    }
    bindingRegExp() {
        return new RegExp("^" + this.prefix + "-");
    }
    buildBinding(binding, node, type, declaration) {
        var context, ctx, dependencies, keypath, options, pipe, pipes;
        options = {};
        pipes = (function() {
            var _i, _len, _ref, _results;
            _ref = declaration.split('|');
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                pipe = _ref[_i];
                _results.push(pipe.trim());
            }
            return _results;
        })();
        context = (function() {
            var _i, _len, _ref, _results;
            _ref = pipes.shift().split('<');
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                ctx = _ref[_i];
                _results.push(ctx.trim());
            }
            return _results;
        })();
        keypath = context.shift();
        options.formatters = pipes;
        if (dependencies = context.shift()) {
            options.dependencies = dependencies.split(/\s+/);
        }

        switch(binding){
            case 'Binding'          : binding = new Binding(this, node, type, keypath, options);break;
            case 'ComponentBinding' : binding = new ComponentBinding(this, node, type, keypath, options);break;
            case 'TextBinding'      : binding = new TextBinding(this, node, type, keypath, options);break;
        }
        return this.bindings.push(binding);
    }
    build() {
        var el, parse, _i, _len, _ref;
        this.bindings = [];
        parse = (function(_this) {
            return function(node) {
                var block, childNode, delimiters, n, parser, text, token, tokens, _i, _j, _len, _len1, _ref, _results;
                if (node.nodeType === 3) {
                    parser = TextTemplateParser;
                    if (delimiters = _this.templateDelimiters) {
                        if ((tokens = parser.parse(node.data, delimiters)).length) {
                            if (!(tokens.length === 1 && tokens[0].type === parser.types.text)) {
                                for (_i = 0, _len = tokens.length; _i < _len; _i++) {
                                    token = tokens[_i];
                                    text = document.createTextNode(token.value);
                                    node.parentNode.insertBefore(text, node);
                                    if (token.type === 1) {
                                        _this.buildBinding('TextBinding', text, null, token.value);
                                    }
                                }
                                node.parentNode.removeChild(node);
                            }
                        }
                    }
                } else if (node.nodeType === 1) {
                    block = _this.traverse(node);
                }
                if (!block) {
                    _ref = (function() {
                        var _k, _len1, _ref, _results1;
                        _ref = node.childNodes;
                        _results1 = [];
                        for (_k = 0, _len1 = _ref.length; _k < _len1; _k++) {
                            n = _ref[_k];
                            _results1.push(n);
                        }
                        return _results1;
                    })();
                    _results = [];
                    for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                        childNode = _ref[_j];
                        _results.push(parse(childNode));
                    }
                    return _results;
                }
            };
        })(this);
        _ref = this.els;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            el = _ref[_i];
            parse(el);
        }
        this.bindings.sort(function(a, b) {
            var _ref1, _ref2;
            return (((_ref1 = b.binder) != null ? _ref1.priority : void 0) || 0) - (((_ref2 = a.binder) != null ? _ref2.priority : void 0) || 0);
        });
    }
    traverse(node) {
        var attribute, attributes, binder, bindingRegExp, block, identifier, regexp, type, value, _i, _j, _len, _len1, _ref, _ref1, _ref2;
        bindingRegExp = this.bindingRegExp();
        block = node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE';
        _ref = node.attributes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            attribute = _ref[_i];
            if (bindingRegExp.test(attribute.name)) {
                type = attribute.name.replace(bindingRegExp, '');
                if (!(binder = this.binders[type])) {
                    _ref1 = this.binders;
                    for (identifier in _ref1) {
                        value = _ref1[identifier];
                        if (identifier !== '*' && identifier.indexOf('*') !== -1) {
                            regexp = new RegExp("^" + (identifier.replace(/\*/g, '.+')) + "$");
                            if (regexp.test(type)) {
                                binder = value;
                            }
                        }
                    }
                }
                binder || (binder = this.binders['*']);
                if (binder.block) {
                    block = true;
                    attributes = [attribute];
                }
            }
        }
        _ref2 = attributes || node.attributes;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            attribute = _ref2[_j];
            if (bindingRegExp.test(attribute.name)) {
                type = attribute.name.replace(bindingRegExp, '');
                this.buildBinding('Binding', node, type, attribute.value);
            }
        }
        if (!block) {
            type = node.nodeName.toLowerCase();
            if (this.components[type] && !node._bound) {
                this.bindings.push(new ComponentBinding(this, node, type));
                block = true;
            }
        }
        return block;
    }
    select(fn) {
        var binding, _i, _len, _ref, _results;
        _ref = this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            if (fn(binding)) {
                _results.push(binding);
            }
        }
        return _results;
    }
    bind() {
        var binding, _i, _len, _ref, _results;
        _ref = this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results.push(binding.bind());
        }
        return _results;
    }
    unbind() {
        var binding, _i, _len, _ref, _results;
        _ref = this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results.push(binding.unbind());
        }
        return _results;
    }
    sync() {
        var binding, _i, _len, _ref, _results;
        _ref = this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results.push(typeof binding.sync === "function" ? binding.sync() : void 0);
        }
        return _results;
    }
    publish() {
        var binding, _i, _len, _ref, _results;
        _ref = this.select(function(b) {
            var _ref;
            return (_ref = b.binder) != null ? _ref.publishes : void 0;
        });
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results.push(binding.publish());
        }
        return _results;
    }
    update(models) {
        var binding, key, model, _i, _len, _ref, _results;
        if (models == null) {
            models = {};
        }
        for (key in models) {
            model = models[key];
            this.models[key] = model;
        }
        _ref = this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results.push(typeof binding.update === "function" ? binding.update(models) : void 0);
        }
        return _results;
    }
}
export class Binding {
    constructor(view, el, type, keypath, options) {
        this.view = view;
        this.el = el;
        this.type = type;
        this.keypath = keypath;
        this.options = options != null ? options : {};
        this.formatters = this.options.formatters || [];
        this.dependencies = [];
        this.formatterObservers = {};
        this.model = void 0;
        [
            'setBinder',
            'sync',
            'observe',
            'parseTarget',
            'formattedValue',
            'eventHandler',
            'set',
            'sync',
            'publish',
            'bind',
            'unbind',
            'update',
            'getValue'
        ].forEach(m=>{this[m] = this[m].bind(this);})
        this.setBinder();
    }
    setBinder() {
        var identifier, regexp, value, _ref;
        if (!(this.binder = this.view.binders[this.type])) {
            _ref = this.view.binders;
            for (identifier in _ref) {
                value = _ref[identifier];
                if (identifier !== '*' && identifier.indexOf('*') !== -1) {
                    regexp = new RegExp("^" + (identifier.replace(/\*/g, '.+')) + "$");
                    if (regexp.test(this.type)) {
                        this.binder = value;
                        this.args = new RegExp("^" + (identifier.replace(/\*/g, '(.+)')) + "$").exec(this.type);
                        this.args.shift();
                    }
                }
            }
        }
        this.binder || (this.binder = this.view.binders['*']);
        if (this.binder instanceof Function) {
            return this.binder = {
                routine: this.binder
            };
        }
    }
    observe(obj, keypath, callback) {
        return Watcher.watch(obj, keypath, callback, {
            root        : this.view.rootInterface,
            adapters    : this.view.adapters
        });
    }
    parseTarget() {
        var token;
        token = TypeParser.parse(this.keypath);
        if (token.type === 0) {
            return this.value = token.value;
        } else {
            this.observer = this.observe(this.view.models, this.keypath, this.sync);
            return this.model = this.observer.target;
        }
    }
    formattedValue(value) {
        var ai, arg, args, fi, formatter, id, observer, processedArgs, _base, _i, _j, _len, _len1, _ref;
        _ref = this.formatters;
        for (fi = _i = 0, _len = _ref.length; _i < _len; fi = ++_i) {
            formatter = _ref[fi];
            args = formatter.match(/[^\s']+|'([^']|'[^\s])*'|"([^"]|"[^\s])*"/g);
            id = args.shift();
            formatter = this.view.formatters[id];
            args = (function() {
                var _j, _len1, _results;
                _results = [];
                for (_j = 0, _len1 = args.length; _j < _len1; _j++) {
                    arg = args[_j];
                    _results.push(TypeParser.parse(arg));
                }
                return _results;
            })();
            processedArgs = [];
            for (ai = _j = 0, _len1 = args.length; _j < _len1; ai = ++_j) {
                arg = args[ai];
                processedArgs.push(arg.type === 0 ? arg.value : ((_base = this.formatterObservers)[fi] || (_base[fi] = {}), !(observer = this.formatterObservers[fi][ai]) ? (observer = this.observe(this.view.models, arg.value, this.sync), this.formatterObservers[fi][ai] = observer) : void 0, observer.value()));
            }
            if ((formatter != null ? formatter.read : void 0) instanceof Function) {
                value = formatter.read.apply(formatter, [value].concat(processedArgs));
            } else if (formatter instanceof Function) {
                value = formatter.apply(null, [value].concat(processedArgs));
            }
        }
        return value;
    }
    eventHandler(fn) {
        var binding, handler;
        handler = (binding = this).view.handler;
        return function(ev) {
            return handler.call(fn, this, ev, binding);
        };
    }
    set(value) {
        var _ref;
        value = value instanceof Function && !this.binder["function"] ? this.formattedValue(value.call(this.model)) : this.formattedValue(value);
        return (_ref = this.binder.routine) != null ? _ref.call(this, this.el, value) : void 0;
    }
    sync() {
        var dependency, observer;
        return this.set((function() {
            var _i, _j, _len, _len1, _ref, _ref1, _ref2;
            if (this.observer) {
                if (this.model !== this.observer.target) {
                    _ref = this.dependencies;
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        observer = _ref[_i];
                        observer.unobserve();
                    }
                    this.dependencies = [];
                    if (((this.model = this.observer.target) != null) && ((_ref1 = this.options.dependencies) != null ? _ref1.length : void 0)) {
                        _ref2 = this.options.dependencies;
                        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
                            dependency = _ref2[_j];
                            observer = this.observe(this.model, dependency, this.sync);
                            this.dependencies.push(observer);
                        }
                    }
                }
                return this.observer.value();
            } else {
                return this.value;
            }
        }).call(this));
    }
    publish() {
        var args, formatter, id, value, _i, _len, _ref, _ref1, _ref2;
        if (this.observer) {
            value = this.getValue(this.el);
            _ref = this.formatters.slice(0).reverse();
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                formatter = _ref[_i];
                args = formatter.split(/\s+/);
                id = args.shift();
                if ((_ref1 = this.view.formatters[id]) != null ? _ref1.publish : void 0) {
                    value = (_ref2 = this.view.formatters[id]).publish.apply(_ref2, [value].concat(args));
                }
            }
            return this.observer.setValue(value);
        }
    }
    bind() {
        var dependency, observer, _i, _len, _ref, _ref1, _ref2;
        this.parseTarget();
        if ((_ref = this.binder.bind) != null) {
            _ref.call(this, this.el);
        }
        if ((this.model != null) && ((_ref1 = this.options.dependencies) != null ? _ref1.length : void 0)) {
            _ref2 = this.options.dependencies;
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
                dependency = _ref2[_i];
                observer = this.observe(this.model, dependency, this.sync);
                this.dependencies.push(observer);
            }
        }
        if (this.view.preloadData) {
            return this.sync();
        }
    }
    unbind() {
        var ai, args, fi, observer, _i, _len, _ref, _ref1, _ref2, _ref3;
        if ((_ref = this.binder.unbind) != null) {
            _ref.call(this, this.el);
        }
        if ((_ref1 = this.observer) != null) {
            _ref1.unobserve();
        }
        _ref2 = this.dependencies;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            observer = _ref2[_i];
            observer.unobserve();
        }
        this.dependencies = [];
        _ref3 = this.formatterObservers;
        for (fi in _ref3) {
            args = _ref3[fi];
            for (ai in args) {
                observer = args[ai];
                observer.unobserve();
            }
        }
        return this.formatterObservers = {};
    }
    update(models) {
        var _ref, _ref1;
        if (models == null) {
            models = {};
        }
        this.model = (_ref = this.observer) != null ? _ref.target : void 0;
        return (_ref1 = this.binder.update) != null ? _ref1.call(this, models) : void 0;
    }
    getValue(el) {
        if (this.binder && (this.binder.getValue != null)) {
            return this.binder.getValue.call(this, el);
        } else {
            return Util.getInputValue(el);
        }
    }
}
export class ComponentBinding extends Binding{
    constructor(view,el,type) {
        super(view,el,type);
        [
            'sync',
            'update',
            'publish',
            'locals',
            'camelCase',
            'bind',
            'unbind'
        ].forEach(m=>{this[m] = this[m].bind(this);})
        this.component = this.view.components[this.type];
        this.static = {};
        this.observers = {};
        this.upstreamObservers = {};
        var bindingRegExp = view.bindingRegExp();
        if(this.el.attributes){
            for (var i = 0;i<this.el.attributes.length;i++) {
                var attribute = this.el.attributes[i];
                if (!bindingRegExp.test(attribute.name)) {
                    var propertyName = this.camelCase(attribute.name);
                    var statics = this.component["static"];
                    if(statics && statics.indexOf(propertyName) >= 0){
                        this["static"][propertyName] = attribute.value;
                    } else {
                        this.observers[propertyName] = attribute.value;
                    }
                }
            }
        }
    }
    setBinder() {}
    sync() {}
    update() {}
    publish() {}
    locals() {
        var key, observer, result, value, _ref, _ref1;
        result = {};
        _ref = this["static"];
        for (key in _ref) {
            value = _ref[key];
            result[key] = value;
        }
        _ref1 = this.observers;
        for (key in _ref1) {
            observer = _ref1[key];
            result[key] = observer.value();
        }
        return result;
    }
    camelCase(string) {
        return string.replace(/-([a-z])/g, function(grouped) {
            return grouped[1].toUpperCase();
        });
    }
    bind() {
        var k, key, keypath, observer, option, options, scope, v, _base,
        _i, _j, _len, _len1, _ref, _ref1,
        _ref2, _ref3, _ref4, _ref5, _ref6, _results;
        if (!this.bound) {
            _ref = this.observers;
            for (key in _ref) {
                keypath = _ref[key];
                this.observers[key] = this.observe(this.view.models, keypath, ((function(_this) {
                    return function(key) {
                        return function() {
                            return _this.componentView.models[key] = _this.observers[key].value();
                        };
                    };
                })(this)).call(this, key));
            }
            this.bound = true;
        }
        if (this.componentView != null) {
            return this.componentView.bind();
        } else {
            this.el.innerHTML = this.component.template.call(this);
            scope = this.component.initialize.call(this, this.el, this.locals());
            this.el._bound = true;
            options = {};
            _ref1 = ['binders', 'formatters', 'components', 'adapters'];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                option = _ref1[_i];
                options[option] = {};
                if (this.component[option]) {
                    _ref2 = this.component[option];
                    for (k in _ref2) {
                        v = _ref2[k];
                        options[option][k] = v;
                    }
                }
                _ref3 = this.view[option];
                for (k in _ref3) {
                    v = _ref3[k];
                    if ((_base = options[option])[k] == null) {
                        _base[k] = v;
                    }
                }
            }
            _ref4 = 'prefix', 'templateDelimiters', 'rootInterface', 'preloadData', 'handler';
            for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
                option = _ref4[_j];
                options[option] = (_ref5 = this.component[option]) != null ? _ref5 : this.view[option];
            }
            this.componentView = new View(this.el, scope, options);
            this.componentView.bind();
            _ref6 = this.observers;
            _results = [];
            for (key in _ref6) {
                observer = _ref6[key];
                _results.push(this.upstreamObservers[key] = this.observe(this.componentView.models, key, ((function(_this) {
                    return function(key, observer) {
                        return function() {
                            return observer.setValue(_this.componentView.models[key]);
                        };
                    };
                })(this)).call(this, key, observer)));
            }
            return _results;
        }
    }
    unbind() {
        var key, observer, _ref, _ref1, _ref2;
        _ref = this.upstreamObservers;
        for (key in _ref) {
            observer = _ref[key];
            observer.unobserve();
        }
        _ref1 = this.observers;
        for (key in _ref1) {
            observer = _ref1[key];
            observer.unobserve();
        }
        return (_ref2 = this.componentView) != null ? _ref2.unbind.call(this) : void 0;
    }
}
export class TextBinding extends Binding {
    constructor(view, el, type, keypath, options) {
        super(view,el,type,keypath,options);
    }
    setBinder(){
        this.binder = {
            routine: function(node, value) {
                return node.data = value != null ? value : '';
            }
        }
    }
}
export class Rivets {
    static binders              = {
        'text'      : function(el, value) {
            if (el.textContent != null) {
                return el.textContent = value != null ? value : '';
            } else {
                return el.innerText = value != null ? value : '';
            }
        },
        'html'      : function(el, value) {
            return el.innerHTML = value != null ? value : '';
        },
        'show'      : function(el, value) {
            return el.style.display = value ? '' : 'none';
        },
        'hide'      : function(el, value) {
            return el.style.display = value ? 'none' : '';
        },
        'enabled'   : function(el, value) {
            return el.disabled = !value;
        },
        'disabled'  : function(el, value) {
            return el.disabled = !!value;
        },
        'class-*'   : function(el, value) {
            var elClass;
            elClass = " " + el.className + " ";
            if (!value === (elClass.indexOf(" " + this.args[0] + " ") !== -1)) {
                return el.className = value ? "" + el.className + " " + this.args[0] : elClass.replace(" " + this.args[0] + " ", ' ').trim();
            }
        },
        '*'         : function(el, value) {
            if (value != null) {
                return el.setAttribute(this.type, value);
            } else {
                return el.removeAttribute(this.type);
            }
        },
        'checked'   : {
            publishes: true,
            priority: 2000,
            bind: function(el) {
                return Util.bindEvent(el, 'change', this.publish);
            },
            unbind: function(el) {
                return Util.unbindEvent(el, 'change', this.publish);
            },
            routine: function(el, value) {
                var _ref;
                if (el.type === 'radio') {
                    return el.checked = ((_ref = el.value) != null ? _ref.toString() : void 0) === (value != null ? value.toString() : void 0);
                } else {
                    return el.checked = !!value;
                }
            }
        },
        'unchecked' : {
            publishes: true,
            priority: 2000,
            bind: function(el) {
                return Util.bindEvent(el, 'change', this.publish);
            },
            unbind: function(el) {
                return Util.unbindEvent(el, 'change', this.publish);
            },
            routine: function(el, value) {
                var _ref;
                if (el.type === 'radio') {
                    return el.checked = ((_ref = el.value) != null ? _ref.toString() : void 0) !== (value != null ? value.toString() : void 0);
                } else {
                    return el.checked = !value;
                }
            }
        },
        'value'     : {
            publishes: true,
            priority: 3000,
            bind: function(el) {
                if (!(el.tagName === 'INPUT' && el.type === 'radio')) {
                    this.event = el.tagName === 'SELECT' ? 'change' : 'input';
                    return Util.bindEvent(el, this.event, this.publish);
                }
            },
            unbind: function(el) {
                if (!(el.tagName === 'INPUT' && el.type === 'radio')) {
                    return Util.unbindEvent(el, this.event, this.publish);
                }
            },
            routine: function(el, value) {
                var o, _i, _len, _ref, _ref1, _ref2, _results;
                if (el.tagName === 'INPUT' && el.type === 'radio') {
                    return el.setAttribute('value', value);
                } else if (window.jQuery != null) {
                    el = jQuery(el);
                    if ((value != null ? value.toString() : void 0) !== ((_ref = el.val()) != null ? _ref.toString() : void 0)) {
                        return el.val(value != null ? value : '');
                    }
                } else {
                    if (el.type === 'select-multiple') {
                        if (value != null) {
                            _results = [];
                            for (_i = 0, _len = el.length; _i < _len; _i++) {
                                o = el[_i];
                                _results.push(o.selected = (_ref1 = o.value, value.indexOf(_ref1) >= 0));
                            }
                            return _results;
                        }
                    } else if ((value != null ? value.toString() : void 0) !== ((_ref2 = el.value) != null ? _ref2.toString() : void 0)) {
                        return el.value = value != null ? value : '';
                    }
                }
            }
        },
        'if'        : {
            block: true,
            priority: 4000,
            bind: function(el) {
                var attr, declaration;
                if (this.marker == null) {
                    attr = [this.view.prefix, this.type].join('-').replace('--', '-');
                    declaration = el.getAttribute(attr);
                    this.marker = document.createComment(" rivets: " + this.type + " " + declaration + " ");
                    this.bound = false;
                    el.removeAttribute(attr);
                    el.parentNode.insertBefore(this.marker, el);
                    return el.parentNode.removeChild(el);
                }
            },
            unbind: function() {
                var _ref;
                return (_ref = this.nested) != null ? _ref.unbind() : void 0;
            },
            routine: function(el, value) {
                var key, model, models, _ref;
                if (!!value === !this.bound) {
                    if (value) {
                        models = {};
                        _ref = this.view.models;
                        for (key in _ref) {
                            model = _ref[key];
                            models[key] = model;
                        }
                        (this.nested || (this.nested = new View(el, models, this.view.options()))).bind();
                        this.marker.parentNode.insertBefore(el, this.marker.nextSibling);
                        return this.bound = true;
                    } else {
                        el.parentNode.removeChild(el);
                        this.nested.unbind();
                        return this.bound = false;
                    }
                }
            },
            update: function(models) {
                var _ref;
                return (_ref = this.nested) != null ? _ref.update(models) : void 0;
            }
        },
        'unless'    : {
            block: true,
            priority: 4000,
            bind: function(el) {
                return Rivets.binders["if"].bind.call(this, el);
            },
            unbind: function() {
                return Rivets.binders["if"].unbind.call(this);
            },
            routine: function(el, value) {
                return Rivets.binders["if"].routine.call(this, el, !value);
            },
            update: function(models) {
                return Rivets.binders["if"].update.call(this, models);
            }
        },
        'on-*'      : {
            "function": true,
            priority: 1000,
            unbind: function(el) {
                if (this.handler) {
                    return Util.unbindEvent(el, this.args[0], this.handler);
                }
            },
            routine: function(el, value) {
                if (this.handler) {
                    Util.unbindEvent(el, this.args[0], this.handler);
                }
                return Util.bindEvent(el, this.args[0], this.handler = this.eventHandler(value));
            }
        },
        'each-*'    : {
            block: true,
            priority: 4000,
            bind: function(el) {
                var attr, view, _i, _len, _ref;
                if (this.marker == null) {
                    attr = [this.view.prefix, this.type].join('-').replace('--', '-');
                    this.marker = document.createComment(" rivets: " + this.type + " ");
                    this.iterated = [];
                    el.removeAttribute(attr);
                    el.parentNode.insertBefore(this.marker, el);
                    el.parentNode.removeChild(el);
                } else {
                    _ref = this.iterated;
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        view = _ref[_i];
                        view.bind();
                    }
                }
            },
            unbind: function(el) {
                var view, _i, _len, _ref, _results;
                if (this.iterated != null) {
                    _ref = this.iterated;
                    _results = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        view = _ref[_i];
                        _results.push(view.unbind());
                    }
                    return _results;
                }
            },
            routine: function(el, collection) {
                var binding, data, i, index, key, model, modelName, options, previous, template, view, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
                modelName = this.args[0];
                collection = collection || [];
                if (this.iterated.length > collection.length) {
                    _ref = Array(this.iterated.length - collection.length);
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        i = _ref[_i];
                        view = this.iterated.pop();
                        view.unbind();
                        this.marker.parentNode.removeChild(view.els[0]);
                    }
                }
                for (index = _j = 0, _len1 = collection.length; _j < _len1; index = ++_j) {
                    model = collection[index];
                    data = {
                        index: index
                    };
                    data[modelName] = model;
                    if (this.iterated[index] == null) {
                        _ref1 = this.view.models;
                        for (key in _ref1) {
                            model = _ref1[key];
                            if (data[key] == null) {
                                data[key] = model;
                            }
                        }
                        previous = this.iterated.length ? this.iterated[this.iterated.length - 1].els[0] : this.marker;
                        options = this.view.options();
                        options.preloadData = true;
                        template = el.cloneNode(true);
                        view = new View(template, data, options);
                        view.bind();
                        this.iterated.push(view);
                        this.marker.parentNode.insertBefore(template, previous.nextSibling);
                    } else if (this.iterated[index].models[modelName] !== model) {
                        this.iterated[index].update(data);
                    }
                }
                if (el.nodeName === 'OPTION') {
                    _ref2 = this.view.bindings;
                    _results = [];
                    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                        binding = _ref2[_k];
                        if (binding.el === this.marker.parentNode && binding.type === 'value') {
                            _results.push(binding.sync());
                        } else {
                            _results.push(void 0);
                        }
                    }
                    return _results;
                }
            },
            update: function(models) {
                var data, key, model, view, _i, _len, _ref, _results;
                data = {};
                for (key in models) {
                    model = models[key];
                    if (key !== this.args[0]) {
                        data[key] = model;
                    }
                }
                _ref = this.iterated;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    view = _ref[_i];
                    _results.push(view.update(data));
                }
                return _results;
            }
        }
    };
    static adapters             = {
        '.'             : {
            id                      : '_rv',
            counter                 : 0,
            weakmap                 : {},
            weakReference           : function(obj) {
                var id, _base, _name;
                if (!obj.hasOwnProperty(this.id)) {
                    id = this.counter++;
                    Object.defineProperty(obj, this.id, {
                        value: id
                    });
                }
                return (_base = this.weakmap)[_name = obj[this.id]] || (_base[_name] = {callbacks:{}});
            },
            cleanupWeakReference    : function(ref, id) {
                if (!Object.keys(ref.callbacks).length) {
                    if (!(ref.pointers && Object.keys(ref.pointers).length)) {
                        return delete this.weakmap[id];
                    }
                }
            },
            stubFunction            : function(obj, fn) {
                var map, original, weakmap;
                original = obj[fn];
                map = this.weakReference(obj);
                weakmap = this.weakmap;
                return obj[fn] = function() {
                    var callback, k, r, response, _i, _len, pointers, _ref1, _ref2, _ref3;
                    response = original.apply(obj, arguments);
                    pointers = map.pointers;
                    for (r in pointers) {
                        k = pointers[r];
                        _ref3 = (_ref1 = (_ref2 = weakmap[r]) != null ? _ref2.callbacks[k] : void 0) != null ? _ref1 : [];
                        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
                            callback = _ref3[_i];
                            callback();
                        }
                    }
                    return response;
                };
            },
            observeMutations        : function(obj, ref, keypath) {
                var fn, functions, map, _base, _i, _len;
                if (obj instanceof Array) {
                    map = this.weakReference(obj);
                    if (map.pointers == null) {
                        map.pointers = {};
                        functions = ['push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'splice'];
                        for (_i = 0, _len = functions.length; _i < _len; _i++) {
                            fn = functions[_i];
                            this.stubFunction(obj, fn);
                        }
                    }
                    if ((_base = map.pointers)[ref] == null) {
                        _base[ref] = [];
                    }
                    if (map.pointers[ref].indexOf(keypath) < 0) {
                        return map.pointers[ref].push(keypath);
                    }
                }
            },
            unobserveMutations      : function(obj, ref, keypath) {
                var idx, map, pointers;
                if (Array.isArray(obj) && (obj[this.id] != null)) {
                    if (map = this.weakmap[obj[this.id]]) {
                        if (pointers = map.pointers[ref]) {
                            if ((idx = pointers.indexOf(keypath)) >= 0) {
                                pointers.splice(idx, 1);
                            }
                            if (!pointers.length) {
                                delete map.pointers[ref];
                            }
                            return this.cleanupWeakReference(map, obj[this.id]);
                        }
                    }
                }
            },
            observe                 : function(obj, keypath, callback) {
                var callbacks, desc, value;
                callbacks = this.weakReference(obj).callbacks;
                if (callbacks[keypath] == null) {
                    callbacks[keypath] = [];
                    desc = Object.getOwnPropertyDescriptor(obj, keypath);
                    if (!((desc != null ? desc.get : void 0) || (desc != null ? desc.set : void 0))) {
                        value = obj[keypath];
                        Object.defineProperty(obj, keypath, {
                            enumerable: true,
                            get: function() {
                                return value;
                            },
                            set: (function(_this) {
                                return function(newValue) {
                                    var map, _i, _len, _ref;
                                    if (newValue !== value) {
                                        _this.unobserveMutations(value, obj[_this.id], keypath);
                                        value = newValue;
                                        if (map = _this.weakmap[obj[_this.id]]) {
                                            callbacks = map.callbacks;
                                            if (callbacks[keypath]) {
                                                _ref = callbacks[keypath].slice();
                                                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                                                    callback = _ref[_i];
                                                    if (callbacks[keypath].indexOf(callback) >= 0) {
                                                        callback();
                                                    }
                                                }
                                            }
                                            return _this.observeMutations(newValue, obj[_this.id], keypath);
                                        }
                                    }
                                };
                            })(this)
                        });
                    }
                }
                if (callbacks[keypath].indexOf(callback) < 0) {
                    callbacks[keypath].push(callback);
                }
                return this.observeMutations(obj[keypath], obj[this.id], keypath);
            },
            unobserve               : function(obj, keypath, callback) {
                var callbacks, idx, map;
                if (map = this.weakmap[obj[this.id]]) {
                    if (callbacks = map.callbacks[keypath]) {
                        if ((idx = callbacks.indexOf(callback)) >= 0) {
                            callbacks.splice(idx, 1);
                            if (!callbacks.length) {
                                delete map.callbacks[keypath];
                            }
                        }
                        this.unobserveMutations(obj[keypath], obj[this.id], keypath);
                        return this.cleanupWeakReference(map, obj[this.id]);
                    }
                }
            },
            get                     : function(obj, keypath) {
                return obj[keypath];
            },
            set                     : function(obj, keypath, value) {
                return obj[keypath] = value;
            }
        }
    };
    static components           = {};
    static formatters           = {
        grad  : function(value,prefix,max,cnt){
            value = Math.min(max,value);
            return prefix+(value===0?0:Math.round((value/max)*cnt));
        },
        or    : function(value,compare){
            return compare||compare
        },
        and    : function(value,compare){
            return compare&&compare
        },
        eq    : function(value,compare){
            return compare==compare
        },
        not   : function(value){
            return !value;
        },
        name  : function(value){
            var name = value.trim().split(/\s+/);
            var fname = name.shift()
            var mname = '';
            if(name.length){
                mname = name.map(n=>n.charAt(0)).join('.')+'.'
            }
            return [fname,mname].join(' ').replace(/\s+/,' ').trim();
        },
        limit : function(value,cnt){
            if(value.length>cnt){
                return value.substring(0,cnt)+'...'
            }else{
                return value;
            }
        }
    };
    static prefix               = 'rv';
    static templateDelimiters   = ['{', '}'];
    static rootInterface        = '.';
    static preloadData          = true;
    static handler(context, ev, binding) {
    return this.call(context, ev, binding.view.models);
}
    static configure(options) {
        var descriptor, key, option, value;
        if (options == null) {
            options = {};
        }
        for (option in options) {
            value = options[option];
            if (option === 'binders' || option === 'components' || option === 'formatters' || option === 'adapters') {
                for (key in value) {
                    descriptor = value[key];
                    Rivets[option][key] = descriptor;
                }
            } else {
                Rivets[option] = value;
            }
        }
    }
    static bind(el, models, options) {
        var view;
        if (models == null) {
            models = {};
        }
        if (options == null) {
            options = {};
        }
        view = new View(el, models, options);
        view.bind();
        return view;
    }
    static init(component, el, data) {
        var scope, template, view;
        if (data == null) {
            data = {};
        }
        if (el == null) {
            el = document.createElement('div');
        }
        component = Rivets.components[component];
        template = component.template.call(this, el);
        if (template instanceof HTMLElement) {
            while (el.firstChild) {
                el.removeChild(el.firstChild);
            }
            el.appendChild(template);
        } else {
            el.innerHTML = template;
        }
        scope = component.initialize.call(this, el, data);
        view = new View(el, scope);
        view.bind();
        return view;
    }
}
export default Rivets;