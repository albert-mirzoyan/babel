class Utils {
    keys(target){
        return Object.keys(target);
    }
    values(target){
        return this.keys(target).map(k=>target[k]);
    }
    assign(...args){
        var n,o = args.shift();
        while(args.length){
            n = args.shift();
            this.keys(n).forEach(k=>{
                o[k] = n[k];
            })
        }
        return o;
    }
    clone(target){
        if(!this.isObject(target)){
            return target;
        }else
        if(this.isArray(target)){
            return target.slice();
        }else{
            return this.assign({},target);
        }
    }
    compare(a,b,deep){
        deep = this.isBoolean(deep) ? deep : true;
        // Identical objects are equal. `0 === -0`, but they aren't identical.
        // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
        if (a === b){
            return a !== 0 || 1 / a === 1 / b;
        }
        // A strict comparison is necessary because `null == undefined`.
        if (a == null || b == null){
            return a === b;
        }
        // `NaN`s are equivalent, but non-reflexive.
        if (a !== a){
            return b !== b;
        }
        // Exhaust primitive checks
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b !== 'object'){
            return false;
        }
        if(deep){
            var aStack = this.isArray(arguments[3]) ? arguments[3] : [];
            var bStack = this.isArray(arguments[4]) ? arguments[4] : [];
            var length = aStack.length;
            while (length--) {
                // Linear search. Performance is inversely proportional to the number of
                // unique nested structures.
                if(aStack[length] === a){
                    return bStack[length] === b
                }
            }

            // Add the first object to the stack of traversed objects.
            aStack.push(a);
            bStack.push(b);

            // Recursively compare objects and arrays.
            if (this.isArray(a) && this.isArray(b)) {
                // Compare array lengths to determine if a deep comparison is necessary.
                length = a.length;
                if (length !== b.length){
                    return false;
                }
                // Deep compare the contents, ignoring non-numeric properties.
                while (length--) {
                    if(!this.compare(a[length], b[length],deep,aStack, bStack)){
                        return false;
                    }
                }
            } else {
                // Deep compare objects.
                var keys = this.keys(a), key;
                length = keys.length;
                // Ensure that both objects contain the same number of properties before comparing deep equality.
                if (this.keys(b).length !== length){
                    return false;
                }
                while (length--) {
                    // Deep compare each member
                    key = keys[length];
                    if (!(this.has(b, key) && this.compare(a[key], b[key],deep,aStack,bStack))){
                        return false;
                    }
                }
            }
            // Remove the first object from the stack of traversed objects.
            aStack.pop();
            bStack.pop();
            return true;
        }else{
            return false;
        }

    }
    has(target,key) {
        return target != null && target.hasOwnProperty(key);
    }
    hypenize(str){
        return str
            .replace(/([A-Z][a-z]+)/g,'$1 ')
            .replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2')
            .trim()
            .replace(/\s/g,'-')
            .toLowerCase();
    }
    pad(target,num,ch=' ',right=false){
        var str = target||'';
        if(right){
            while(str.length<num){
                str = str + ch;
            }
        }else{
            while(str.length<num){
                str = ch + str;
            }
        }
        return str;
    }
    unid(){
        return Math.floor(Math.random()*0xFFFFFFFF);
    }
    uuid(prefix){
        var uid = this.pad(this.unid().toString(16),8,'0');
        if(prefix){
            return prefix+'-'+uid;
        }else{
            return uid;
        }
    }
    cache(target,property,value){
        return Object.defineProperty(target,property,{
            value:value
        })[property];
    }
    isString(target){
        return typeof target == 'string';
    }
    isFunction(target){
        return typeof target == 'function' || false;
    }
    isArray(target){
        return Array.isArray(target);
    }
    isObject(target){
        var type = typeof target;
        return (
            type === 'function' ||
            type === 'object' && !!target
        );
    }
    isBoolean(target){
        return target === true || target === false;
    }
    isNull(target) {
        return target === null;
    }
    isUndefined(target) {
        return target === void 0;
    }
}
export default new Utils();