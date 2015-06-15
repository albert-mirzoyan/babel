import {Class} from 'asx/runtime';
import Utils from 'asx/runtime/utils';

import Http from './index';
import crypto from 'node/crypto';



import WebSocket from './socket';
import WebHandler from './handler';

export class HttpServer {
    static HANDLERS = {}
    static handler(name){
        return (h)=>{
            if(h instanceof Class){
                var id = name || Utils.hypenize(h.name);
                if(!HttpServer.HANDLERS[id]){
                    HttpServer.HANDLERS[id] = h.constructor;
                    console.info('Registering Class '+h.name+' named "'+id+'" as WebServer handler');
                }else{
                    Error.toss('Handler "'+id+'" already registered');
                }
            }else{
                Error.toss('Invalid Server Handler')
            }
        }
    }
    static initRequest(req){
        req.url = Http.URL.parse(req.url,true);
        req.accept = function(status,headers){
            try {
                if(typeof status=='number'){
                    status = status + ' Todo Take Default Status';
                }
                if(!status.match(/\d+.*/)){
                    status = 500 + status;
                }
                var data = ['HTTP/1.1 '+status];
                for(var key in headers){
                    if(headers[key]){
                        data.push(key+': '+headers[key]);
                    }
                }
                data.push('\r\n');
                data = data.join('\r\n');
                //console.info(data)
                this.socket.write(data,'ascii');
            } catch (ex) {
                console.info(ex);
            }
            return true;
        }
        req.reject = function(status,headers,body){
            this.accept(status,headers);
            if(body){
                this.socket.end(body);
            }else{
                this.socket.end();
            }
            return false;
        }
    }
    static initResponse(res){}
    static start(port,handlers){
        return new HttpServer(port,handlers).start();
    }
    constructor(config){
        this.port = config;
        this.heartbeat = 5000;
        this.handlers = [];
        Object.keys(config).forEach((key)=>{
            if(HttpServer.HANDLERS[key]){
                this.handlers.push(new (HttpServer.HANDLERS[key])(this,config[key]));
            }
        });
        this.doRequest = this.doRequest.bind(this);
        this.doUpgrade = this.doUpgrade.bind(this);
    }
    doRequest(req,res){
        HttpServer.initRequest(req);
        HttpServer.initResponse(res);
        var chain = new Promise((resolve,reject)=>{
            var body = new Buffer(0);
            req.on('data',(chunk)=>{
                body=Buffer.concat([body,chunk],body.length+chunk.length);
            });
            req.on('end',()=>{
                req.body = body;
                resolve();
            });
        });
        this.handlers.forEach((handler)=>{
            chain = chain.then(()=>{
                if(!res.finished){
                    if(handler.handle){
                        return handler.handle(req,res);
                    }
                }else{
                    return true;
                }
            });
        });
        chain.then(s=>{res.end();},(error)=>{
            res.writeHead(500,{
                'Content-Type': 'text/plain'
            });
            res.end(error.stack);
        })
        return chain;
    }
    doUpgrade(req) {
        HttpServer.initRequest(req);
        var chain = new Promise((resolve,reject)=>{
            var body = new Buffer(0);
            req.on('data',(chunk)=>{
                body=Buffer.concat([body,chunk],body.length+chunk.length);
            });
            req.on('end',()=>{
                req.body = body;
                resolve();
            });
        });
        this.handlers.forEach((handler)=>{
            chain = chain.then(()=>{
                if(!req.upgraded){
                    if(handler.upgrade){
                        handler.upgrade(req);
                    }
                }else{
                    return true;
                }
            });
        });
        chain.then(
            s=>{
                if(!req.upgraded){
                    req.reject('406 Not Acceptable')
                }
            },
            e=>{
                req.reject('500 '+e.message,{
                    'Content-Type': 'text/plain'
                },e.stack);
            }
        )
    }
    onReject(ex) {
        //this.emit('error', ex);
    }
    start(port){
        if(!this.server){
            this.port = port || this.port || 8787;
            this.server = new Http.HTTP.Server();
            this.server.on('upgrade',this.doUpgrade);
            this.server.on('request',this.doRequest);
            this.server.listen(this.port);
            return this;
        }else{
            console.warn('Server Already Started')
        }
    }
}
export default HttpServer;