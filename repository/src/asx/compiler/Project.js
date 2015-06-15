import FS from 'fs';
import Path from 'path';
import {Entity} from './util/Entity';
import {Source} from './syntax/Source';

export class Project extends Entity {
    get compiler():Compiler{
        return this.get('compiler');
    }
    get options():Options{
        return this.compiler.options;
    }
    get path(){
        return this.get('path',this.options.path);
    }
    get directory(){
        return this.get('directory',Path.dirname(this.path));
    }
    get sourceRoot(){
        return this.get('sourceRoot',Path.resolve(
            this.directory,this.options.sourceDir
        ));
    }
    get outputRoot(){
        return this.get('outputRoot',Path.resolve(
            this.directory,this.options.outputDir
        ));
    }
    get sourcePaths(){
        return this.get('sourcePaths',(sources)=>{
            if(!Array.isArray(sources)){
                sources = [sources];
            }
            return sources
            .map((item)=>{
                return Path.resolve(this.sourceRoot,item);
            })
            .filter((item,pos,list)=>{
                return (list.indexOf(item) == pos && FS.existsSync(item));
            })
        },this.options.sources);
    }

    get sources(){
        return this.get('sources',{});
    }
    
    constructor(compiler:Compiler) {
        super();
        this.set('compiler',compiler);
    }
    compile(){
        this.sourcePaths.forEach((path)=>{
            this.addSource(path);
        });
        console.info(this.sources);
    }
    addSource(path,parent){
        var source = new Source({
            main        : !parent,
            name        : Path.relative(this.sourceRoot,path),
            project     : this
        });
        if(!this.sources[source.name]){
            this.sources[source.name] = source;
            this.compiler.compileSource(source);
            source.dependencies.forEach((child)=>{
                this.addSource(child,source);
            })
        }
    }
    getSource(path){
        return this.sources[Path.relative(this.sourceRoot,path)];
    }
}
