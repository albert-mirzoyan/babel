import Server from '../server';
import Socket from '../socket';

@Server.handler('sockets')
export class SocketsHandler {
    constructor(server,config){
        this.server = server;
    }
    upgrade(req){
        if(req.headers['upgrade']=='websocket'){
            try{
                var protocols = req.headers['sec-websocket-protocol'];
                if(!protocols){
                    protocols = req.url.pathname.split('/').map(p=>p.trim()).filter(p=>!!p);
                    protocols = protocols.join(', ');
                }
                if(protocols){
                    protocols = protocols.split(',').map(p=>p.trim());
                    var socket = Socket.create(protocols.shift());
                    if(!socket || !socket.accept(this.server,req,protocols)){
                        req.reject('406 Not Acceptable');
                    }else{
                        req.upgraded=true;
                    }
                }else{
                    req.reject('404 Not Found');
                }
            }catch(error){
                console.error(error);
                console.error(error.stack);
                req.reject('500 '+error.message);
            }
        }
    }
}

