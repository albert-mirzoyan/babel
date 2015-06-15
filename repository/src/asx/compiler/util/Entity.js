/**
 * Created by Sergey on 12/12/14.
 */
export class Entity {
    static repeat(times,char='  '){
        return Array(times).join(char);
    }
    static merge(...patches){
        var result = {};
        for(var patch of patches){
            for (var key in patch) {
                result[key] = patch[key];
            }
        }
        return result;
    }
    constructor($={}){
        if($){
            this.set($);
        }
    }
    get $(){
        Object.defineProperty(this,'$',{
            enumerable   : false,
            configurable : false,
            writable     : false,
            value        : {}
        });
        return this.$;
    }
    set(what,value){
        if(typeof what =='object') {
            for (var key in what) {
                this.$[key] = what[key];
            }
        }else
        if(typeof what =='string'){
            this.$[what] = value;
        }
        return this;
    }
    get(what,value,...params){
        if(typeof what == 'string'){
            if(!this.$.hasOwnProperty(what) && value){
                if(typeof value=='function'){
                    this.set(what,value(...params));
                }else{
                    this.set(what,value);
                }
            }
            return this.$[what];
        }else{
            return this.$;
        }
    }
}