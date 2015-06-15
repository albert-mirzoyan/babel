import Server from '../server';

@Server.handler('json')
export class JsonHandler {
    handle(req,res){
        res.json = function(data,status=200){
            res.writeHead(status,{
                'Content-Type': 'application/json'
            });
            this.end(JSON.stringify(data));
        };
        req.json = function(){
            return JSON.parse(this.body);
        };
    }
}
export default JsonHandler;