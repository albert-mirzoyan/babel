import {BaseHandler}  from '../handler';
import {Mime} from '../mime.js';
import Path from 'node/path';
import FS from 'node/fs';
import Server from '../server';

@Server.handler('repository')
export class RepositoryHandler {
    handle(req,res){
        var parts = req.url.pathname.split('/');
        if(parts.length>=3){
            parts = parts.slice(1,3);
            parts.push('project.json');
            var config = Asx.repository.resolve(parts.join('/')).pathname;
            var resource = Asx.repository.resolve('./'+req.url.pathname).pathname;
            if(FS.existsSync(config) && FS.existsSync(resource)){
                config = JSON.parse(FS.readFileSync(config,'utf8'));
                if(config.platforms && config.platforms.indexOf('browser')>=0){
                    res.writeHead(200,{
                        'Content-Type':Mime.getType(resource)
                    });
                    res.end(FS.readFileSync(resource))
                }
            }
        }
    }
}