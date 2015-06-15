import FS from 'node/fs';
import Path from 'node/path';

export class Options {
    constructor(path) {
        var options=path;
        if(typeof path=='string'){
            options = JSON.parse(FS.readFileSync(path,'utf8'));
            options.path = path;
        }
        Object.keys(options).forEach((key)=>{
            Object.defineProperty(this,key,{
                enumerable  : true,
                value       : options[key]
            })
        })
    }
    get sourceDir(){
        return './src';
    }
    get outputDir(){
        return './out';
    }
    get sources(){
        return './index.js';
    }
}

