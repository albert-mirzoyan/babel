import {Class,Member} from 'asx/runtime';


export class Router {
    static ROUTES = {
        GET     :{},
        PUT     :{},
        POST    :{},
        DELETE  :{}
    };
    static getRoute(method,path){
        return Router.ROUTES[method][path];
    }
    static addRoute(method,path,resource,handler){
        Router.ROUTES[method][path]={resource,handler};
    }
}
export class Rest {
    constructor(path){
        return function(target){
            if(target instanceof Class){
                var methods = target.members(m=>Member.isMethod(m) && Member.isInstance(m) && !!m.rest);
                methods.forEach(m=>{
                    Router.addRoute(m.rest.method,path+m.rest.path,target.constructor,m.name);
                })
            }else{
                Error.toss('Only classes support Rest annotation');
            }
        }
    }
    static PATH(path){
        return function(target){
            target.rest = {
                path    : path
            }
        }
    }
    static GET(path){
        return function(target){
            target.rest = {
                method  : 'GET',
                path    : path
            }
        }
    }
    static PUT(path){
        return function(target){
            target.rest = {
                method  : 'PUT',
                path    : path
            }
        }
    }
    static POST(path){
        return function(target){
            target.rest = {
                method  : 'POST',
                path    : path
            }
        }
    }
    static DELETE(path){
        return function(target){
            target.rest = {
                method  : 'DELETE',
                path    : path
            }
        }
    }
}

export default Rest;