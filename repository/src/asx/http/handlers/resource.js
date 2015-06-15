import {BaseHandler}  from '../handler';
import {Mime} from '../mime.js';
import Path from 'node/path';
import FS from 'node/fs';
import Server from '../server';

@Server.handler('resource')
export class ResourceHandler{
    constructor(server,options){
        this.server = server;
        this.options = options
    }
    handle(req,res){
        var path = Path.resolve(this.options.path+'/'+req.url.pathname);
        if(FS.statSync(path).isDirectory()){
            path = Path.resolve(path,'index.html');
        }
        if(FS.statSync(path).isFile()){
            res.writeHead(200,{
                'Content-Type':Mime.getType(path)
            });
            res.end(FS.readFileSync(path))
        }else{
            res.writeHead(404,{
                'Content-Type':'html/text'
            });
            res.write("File Not Found");
        }
    }
}
export default ResourceHandler;