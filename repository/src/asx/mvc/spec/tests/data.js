export class Data {
    static indexOf(array, value) {
        array || (array = [])
        if(array.indexOf)
            return array.indexOf(value);

        for(i in array || {}) {
            if(array[i] === value)
                return i;
        }
        return -1;
    }
    constructor(attributes) {
        this.attributes = attributes || {};
        this.change = {}
    }
    on(key, callback) {
        if(this.hasCallback(key, callback))
            return;
        var ref = this.change[key] || (this.change[key] = []);
        this.change[key].push(callback);
    }
    off(key, callback) {
        var index = Data.indexOf(this.change[key], callback);
        if(index !== -1)
            this.change[key].splice(index, 1);
    }
    set(attributes) {
        var old, key;

        for(key in attributes) {
            old = this.attributes[key];
            this.attributes[key] = attributes[key];
            if(this.get(key) !== old)
                this.alertCallbacks(key);
        }
    }
    get(key) {
        return this.attributes[key];
    }
    hasCallback(key, callback) {
        return Data.indexOf(this.change[key], callback) !== -1;
    }
    alertCallbacks(key) {
        if(!this.change[key])
            return;
        var key, callbacks;
        for(i in this.change[key]) {
            this.change[key][i](this.get(key));
        }
    }
}


