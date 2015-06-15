export class Ajax {
    requestSync(method,url,headers=null,body=null){
        var request = new XMLHttpRequest();
        request.open(method, url, false);
        if(headers){
            Object.keys(headers).forEach(k=>{
                request.setRequestHeader(k, headers[k]);
            })
        }
        if(body){
            request.send(body);
        }else{
            request.send();
        }
        if (request.status != 200) {
            throw new Error('File not found ' + path);
        }
        return {
            status  : request.status,
            headers : request.getAllResponseHeaders(),
            content : request.response
        };
    }
    readSync(url){
        return this.requestSync('GET',url).content;
    }
    readJsonSync(url){
        return JSON.parse(this.readSync(url));
    }
}
export default new Ajax();
