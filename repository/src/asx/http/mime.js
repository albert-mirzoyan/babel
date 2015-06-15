import PATH from 'node/path';
export class Mime {
    static get TYPES(){return{
        '.js'   : 'text/javascript',
        '.css'  : 'text/css',
        '.html' : 'text/html'
    }}
    static getType(file){
        var ext =PATH.extname(file);
        if(Mime.TYPES[ext]){
            return Mime.TYPES[ext]; 
        }else{
            return ext;
        }
    }
}