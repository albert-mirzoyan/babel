import {Entity} from './util/Entity'
import {Options} from './Options'
import {Project} from './Project'
import {Parser} from './syntax/Parser'
import {Source} from './syntax/Source'
import {Writer} from './targets/ES5/Writer'
import {Transformer} from './targets/ES5/Transformer'


import {DependencyResolver} from './helpers/DependencyResolver'

import FS from 'fs';
import Path from 'path';

export class Compiler extends Entity {
    static compile(options){
        return new Compiler(options).compile();
    }
    constructor(options){
        super(options)
        this.set('options',new Options(options));
        this.set('project',new Project(this));
    }
    get project():Project{
        return this.get('project');
    }
    get options():Options{
        return this.get('options');
    }
    compile(){
        this.project.compile();
        Object.keys(this.project.sources).forEach((key)=>{
            Transformer.transform(this.project.sources[key]);
        });
        Object.keys(this.project.sources).forEach((key)=>{
            Writer.write(this.project.sources[key]);
        });
        
        /*
        var source = this.compileFile(src);
        var output = new Source({
            name    : out
        });
        //Translator.translate(source,output,this.options)
        Writer.write(source,output,this.options);
        console.info(output.content);
        console.info(output.map.toString());
        FS.writeFileSync(output.name,output.content);
        FS.writeFileSync(output.name+'.map',output.map.toString());
        */
    }
    compileSource(source:Source){
        return Parser.parse(source);
    }
    compileFile(src){
        if(!this.sources[src]){
            var source = new Source({
                name    : src,
                content : FS.readFileSync(src,'utf8')
            });
            Parser.parse(source,this.options);
            var dependencies = DependencyResolver.resolve(source,this.options);
            this.sources[src] = source;
            for(var path in dependencies){
                source.dependencies[path] = this.compileFile(this.resolveDependency(source.name,path));
            }
        }
        return this.sources[src]
    }
    resolveDependency(base,path){
        path = Path.resolve(Path.dirname(base),path);
        if(Path.extname(path)!='.js'){
            path = path+'.js'
        }
        return path;
    }
}