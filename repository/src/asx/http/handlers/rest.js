import Server from '../server';
import {Router} from '../rest';

@Server.handler('rest')
export class RestHandler {
    handle(req,res){
        var route = Router.getRoute(req.method,req.url.pathname);
        if(route){
            var Resource = route.resource;
            var handler = route.handler;
            var resource  = new Resource();

            resource.method = req.method;
            resource.path   = req.url.pathname;
            resource.query  = req.url.query;
            if(req.body && req.body.length) {
                resource.body = JSON.parse(req.body.toString());
            }
            return Promise.resolve().then(r=>resource[handler]()).then(
                r=>{
                    res.json({
                        success:'OK',
                        result:r
                    },200);
                },
                e=>{
                    res.json({
                        success     : 'KO',
                        error       : {
                            type    : e.constructor.name,
                            message : e.message,
                            stack   : e.stack.split('\n')
                        }
                    },500);
                }
            );
        }
    }
}
