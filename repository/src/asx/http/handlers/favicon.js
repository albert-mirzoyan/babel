import Server from '../server';

@Server.handler('favicon')
export class FaviconHandler {
    handle(req,res){
        if(req.url.pathname=='/favicon.ico'){
            res.writeHead(200,{
                'Content-Type': 'image/x-icon'
            });
            res.end(new Buffer([
                'AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAA',
                'AAAgAAAAAAAAAAAAAAAEAAAAAAAAAAkU1cAKDc4ABjL2wAM3/IAAA',
                'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                'AAAAAAAAAERERERERERESIiIzMzMzIRIiIjMBMBExEiIiMxMxMzES',
                'IiIzEzEzMRIiIjERMBExEiIiMxMzMzESIiIzEzMzMRIiIjMTMzMxE',
                'iIiMzMzMzESIiIiIiIiIRIiIiIiIiIhEiIiIiIiIiESIiIiIiIiIR',
                'IiIiIiIiIhEREREREREREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
            ].join(),'base64'),'binary');
        }
    }
}
