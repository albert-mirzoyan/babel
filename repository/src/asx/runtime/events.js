export default Emitter;

export class Emitter {
    static inject(target){
        Asx._(target,{events:{
            handlers:{},
            on(handler){
                var key = handler.name;
                if(!key){
                    key = handler.name = /.*/;
                }
                if(key instanceof RegExp){
                    key = '~'+key.toString();
                }
                var handlers = this.handlers[key];
                if(!handlers){
                    handlers = this.handlers[key] = [handler];
                }else{
                    handlers.push(handler);
                }
                return true;
            },
            off(handler){
                if(!handler.name) {
                    this.handlers={};
                }else{
                    var handlers,name = handler.name;
                    if(this.handlers[name]){
                        handlers = this.handlers[name];
                        if(handlers){
                            if(handler.callback){
                                handlers = handlers.filter(h=>(
                                    h.callback!==handler.callback
                                ));
                                if(handlers.length==0){
                                    delete this.handlers[name];
                                }else{
                                    this.handlers[name] = handlers;
                                }
                            }else{
                                delete this.handlers[name];
                            }
                        }
                    }
                    var regexps = Object.keys(this.handlers).filter(h=>h.charAt(0)=='~');
                    if(regexps.length){
                        regexps.forEach(r=>{
                            var rx=r.split('/'),p=rx.shift(),f=rx.pop();
                            rx = new RegExp(rx.join('/'),f);
                            if(rx.test(name)){
                                handlers = this.handlers[r];
                                if(handlers){
                                    if(handler.callback){
                                        handlers = handlers.filter(h=>(
                                            h.callback!==handler.callback
                                        ));
                                        if(handlers.length==0){
                                            delete this.handlers[r];
                                        }else{
                                            this.handlers[r] = handlers;
                                        }
                                    }else{
                                        delete this.handlers[r];
                                    }
                                }
                            }
                        })
                    }
                }
                return true;
            },
            emit(name,args){
                var handlers = [];
                if(this.handlers[name]){
                    handlers = handlers.concat(this.handlers[name]);
                }
                var regexps = Object.keys(this.handlers).filter(h=>h.charAt(0)=='~');
                if(regexps.length){
                    regexps.forEach(r=>{
                        var rx=r.split('/'),p=rx.shift(),f=rx.pop();
                        rx = new RegExp(rx.join('/'),f);
                        if(rx.test(name)){
                            handlers = handlers.concat(this.handlers[r]);
                        }
                    })
                }
                if(handlers){
                    //args.unshift(name);
                    var ev, i = -1, l = handlers.length, a1 = args[0], a2 = args[1], a3 = args[2];
                    while(++i < l){
                        ev = handlers[i];
                        switch (args.length) {
                            case 0: ev.callback.call(ev.context); break;
                            case 1: ev.callback.call(ev.context, a1); break;
                            case 2: ev.callback.call(ev.context, a1,a2); break;
                            case 3: ev.callback.call(ev.context, a1,a2,a3); break;
                            default: ev.callback.apply(ev.context, args); break;
                        }
                        if(ev.once){
                            this.off(ev);
                        }
                    }
                }
                return true;
            }
        }});
        if(!(target instanceof Emitter)){
            target.on = Emitter.prototype.on;
            target.once = Emitter.prototype.once;
            target.emit = Emitter.prototype.emit;
            target.off = Emitter.prototype.off;
        }
    }
    constructor(target){
        Emitter.inject(this);
    }
    on(name,callback,context){
        if(this._.events.on({name,callback,context})){
            return this;
        }
    }
    once(name,callback,context){
        if(this._.events.on({name,callback,context,once:true})){
            return this;
        }
    }
    emit(name,...args){
        if(this._.events.emit(name,args)){
            return this;
        }
    }
    off(name,callback){
        if(this._.events.off({name,callback})){
            return this;
        }
    }
}

function main(){
    var emitter = new Emitter();
    var c1,c2,c3,c4,c5,c6;
    emitter.on('event',c1=(e,...args)=>{
        console.info('    ','c1',e,...args);
    });
    emitter.on('event:other',c2=(e,...args)=>{
        console.info('    ','c2',e,...args);
    });
    emitter.once(/event:.*/,c3=(e,...args)=>{
        console.info('    ','c3',/event:.*/,e,...args);
    });
    emitter.once(/.*/,c4=(e,...args)=>{
        console.info('    ','c4',e,...args);
    });
    emitter.on(/.*\/.*/,c5=(e,...args)=>{
        console.info('    ','c5',e,...args);
    });
    emitter.on(/.*\/.*/,c6=(e,...args)=>{
        console.info('    ','c6',e,...args);
    });


    console.info('event:p1');
    emitter.emit('event:p1',1,2,3);
    emitter.emit('event:p1',1,2,3);
    emitter.emit('event:p1',1,2,3);
    console.info('event:p2');
    emitter.emit('event:p2',1,2,3);
    console.info('event/p3');
    emitter.emit('event/p3',1,2,3);
    console.info('event');
    emitter.emit('event',1,2,3);
    console.info('event');

}
