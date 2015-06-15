import Utils from 'asx/runtime/utils';
export class Adapter {
    observe(obj, keypath, callback) {}
    unobserve(obj, keypath, callback) {}
    get(obj, keypath) {}
    set(obj, keypath, value) {}
}
export class Watcher {
    static adapters = {};
    static watch(obj, keypath, callback, options) {
        return new Watcher(obj, keypath, callback, options);
    }
    static tokenize(keypath, interfaces, root) {
        var tokens = []
        var current = {i: root, path: ''}
        var index, chr
        for (index = 0; index < keypath.length; index++) {
            chr = keypath.charAt(index)
            if (!!~interfaces.indexOf(chr)) {
                tokens.push(current)
                current = {i: chr, path: ''}
            } else {
                current.path += chr
            }
        }
        tokens.push(current)
        return tokens;
    }
    constructor(obj, keypath, callback, options) {
        this.options = options || {}
        this.options.adapters = this.options.adapters || {}
        this.obj = obj
        this.keypath = keypath
        this.callback = callback
        this.objectPath = []
        this.parse()
        if (Utils.isObject(this.target = this.realize())) {
            this.set(true, this.key, this.target, this.callback)
        }
    }
    parse() {
        var interfaces = this.interfaces()
        var root, path
        if (!interfaces.length) {
            Error.toss('Must define at least one adapter interface.')
        }
        if (!!~interfaces.indexOf(this.keypath[0])) {
            root = this.keypath[0]
            path = this.keypath.substr(1)
        } else {
            if (typeof (root = this.options.root || sightglass.root) === 'undefined') {
                Error.toss('Must define a default root adapter.')
            }
            path = this.keypath
        }
        this.tokens = Watcher.tokenize(path, interfaces, root)
        this.key = this.tokens.pop()
    }
    realize() {
        var current = this.obj
        var unreached = false
        var prev

        this.tokens.forEach(function (token, index) {
            if (Utils.isObject(current)) {
                if (typeof this.objectPath[index] !== 'undefined') {
                    if (current !== (prev = this.objectPath[index])) {
                        this.set(false, token, prev, this.update.bind(this))
                        this.set(true, token, current, this.update.bind(this))
                        this.objectPath[index] = current
                    }
                } else {
                    this.set(true, token, current, this.update.bind(this))
                    this.objectPath[index] = current
                }

                current = this.get(token, current)
            } else {
                if (unreached === false) {
                    unreached = index
                }

                if (prev = this.objectPath[index]) {
                    this.set(false, token, prev, this.update.bind(this))
                }
            }
        }, this)

        if (unreached !== false) {
            this.objectPath.splice(unreached)
        }

        return current
    }
    update() {
        var next, oldValue

        if ((next = this.realize()) !== this.target) {
            if (Utils.isObject(this.target)) {
                this.set(false, this.key, this.target, this.callback)
            }

            if (Utils.isObject(next)) {
                this.set(true, this.key, next, this.callback)
            }

            oldValue = this.value()
            this.target = next

            if (this.value() !== oldValue) this.callback()
        }
    }
    value() {
        if (Utils.isObject(this.target)) {
            return this.get(this.key, this.target)
        }
    }
    setValue(value) {
        if (Utils.isObject(this.target)) {
            this.adapter(this.key).set(this.target, this.key.path, value)
        }
    }
    get(key, obj) {
        return this.adapter(key).get(obj, key.path)
    }
    set(active, key, obj, callback) {
        var action = active ? 'observe' : 'unobserve'
        this.adapter(key)[action](obj, key.path, callback)
    }
    interfaces() {
        var interfaces = Object.keys(this.options.adapters)
        Object.keys(Watcher.adapters).forEach(function (i) {
            if (!~interfaces.indexOf(i)) {
                interfaces.push(i)
            }
        })
        return interfaces;
    }
    adapter(key) {
        return this.options.adapters[key.i] || Watcher.adapters[key.i]
    }
    unobserve() {
        var obj
        this.tokens.forEach(function (token, index) {
            if (obj = this.objectPath[index]) {
                this.set(false, token, obj, this.update.bind(this))
            }
        }, this)

        if (Utils.isObject(this.target)) {
            this.set(false, this.key, this.target, this.callback)
        }
    }
}
