import ZLIB from 'node/zlib';
import QS from 'node/querystring';
import URL from 'node/url';
import HTTP from 'node/http';
import HTTPS from 'node/https';

export class Http {
    static URL = URL;
    static HTTP = HTTP;
    static del(url,query,headers,body){
        return Http.request('DELETE',url,query,headers,body);
    }
    static get(url,query,headers,body,stream){
        return Http.request('GET',url,query,headers,body,stream);
    }
    static put(url,body,headers,query){
        return Http.request('PUT',url,query,headers,body);
    }
    static post(url,body,headers,query,stream){
        return Http.request('POST',url,query,headers,body,stream);
    }
    static url(object){
        return Http.URL.parse(object);
    }
    static query(object){
        return QS.stringify(object);
    }
    static form(object){
        return decodeURIComponent(Http.query(object));
    }
    static formEncode(object){
        return Http.query(object);
    }
    static request(method,url,query,headers,body,streamed){
        return new Promise(function(resolve,reject){
            var service,request,u=URL.parse(url,true);
            if(u.query){
                for(var key in query){
                    u.query[key] = query[key]
                }
            }else{
                u.query = query;
            }
            if(u.query){
                u.search = QS.stringify(u.query);
                u.path = `${u.pathname}?${u.search}`;
            }
            u.method = method;
            u.headers = headers;
            if(typeof body=="string"){
                u.headers['Content-Length'] = body.length;
            }
            switch( u.protocol){
                case 'http:' : service = HTTP;break;
                case 'https:': service = HTTPS;break;
                default : throw new Error('undefined protocol for url '+url)
            }
            request  = service.request(u,(res)=>{
                var body = new Buffer(0);
                var stream;
                if((res.headers['content-type'] && res.headers['content-type'].indexOf('application/x-gzip')>=0) || res.headers['content-encoding']=='gzip'){
                    stream =  ZLIB.createGunzip();
                    res.pipe(stream);
                }else{
                    stream = res;
                }
                if(streamed){
                    resolve({
                        stream  : stream,
                        status  : res.statusCode,
                        headers : res.headers
                    })
                }else{
                    stream.on('data',(chunk)=>{
                        body=Buffer.concat([body,chunk],body.length+chunk.length);
                    });
                    stream.on('end',()=>{
                        resolve({
                            body    : body,
                            status  : res.statusCode,
                            headers : res.headers
                        });
                    });
                    stream.on('error',reject)
                }

            });
            request.on('error',reject);
            if(body){
                request.end(body);
            }else{
                request.end();
            }
        });
    }
    static serve(promise,...args){
        var server = HTTP.createServer(function (req, res) {
            new Promise((resolve,reject)=>{
                var body = new Buffer(0);
                req.on('data',(chunk)=>{
                    body=Buffer.concat([body,chunk],body.length+chunk.length);
                });
                req.on('end',()=>{
                    req.body = body;
                    resolve();
                });
            }).then(()=>{
                return promise(req,res)
            })
            .then((success)=>{
                res.end();
            })
            .catch((error)=>{
                res.writeHead(500,{
                    'Content-Type': 'text/plain'
                });
                res.end(error.stack);
            });
        });
        server.listen(...args);
        return server;
    }
}
export default Http;
