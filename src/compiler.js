#!/usr/bin/env node
import {Project} from "./compiler/project"
import {Files} from "./utils/files"

class Compiler {
  static load(conf){
    var config,path = conf;
    if(Files.isDirectory(path)){
      path = Files.resolve(path,'./index.json');
    }
    if(!Files.isFile(path)){
      throw new Error(`Invalid Project Path '${conf}' '${path}'`);
    }else{
      config = Files.readJson(path);
    }
    config.path = path;
    return config;
  }
  static single(config,out){
    if(config.srcPath){
      if(!Files.isDirectory(config.srcPath)){
        throw new Error(`Invalid Source Directory '${config.path}' '${srcPath}'`);
      }
    } else {
      var srcd = Files.dirname(config.path);
      for(var dir of ['source','sources','src']){
        if(dir = Files.isDirectory(Files.resolve(srcd,dir))){
          srcd = dir;
          break;
        }
      }
      config.srcPath = srcd;
    }
    if(!Files.isDirectory(out)){
      throw new Error(`Invalid Output Path '${out}'`);
    }else{
      config.outDir = out;
      config.outPath = Files.resolve(out,config.group,config.project);
    }
    return new Compiler(config);
  }
  static multi(config,out){
    out = out || Files.resolve(Files.dirname(config.path),config.output);
    return Object.keys(config.modules).map(path=>{
      var cp = Files.resolve(Files.dirname(config.path),path)
      var watch = config.modules[path]=='watch';
      var conf = this.load(cp);
      conf.watch = watch;
      //console.info(cp,out,conf)
      return this.single(conf,out);
    })
  }
  static run(){
    try{
      var watch   = false;
      var args    = process.argv.splice(2).filter(arg=>{
        if(arg.charAt(0)=='-'){
          if(arg=='--watch' || arg=='-w'){
            watch = true;
          }
          return false;
        }else{
          return true;
        }
      });
      if(!args.length){
        args.push(process.cwd())
      }
      console.info(args)
      var srcPath = args[0] ? Files.resolve(args[0]):Files.resolve('.');
      var outPath = args[1] ? Files.resolve(args[1]):null;
      var config  = this.load(srcPath);
      if(config.modules){
        this.multi(config,outPath).forEach(c=>c.compile(watch));
      } else {
        this.single(config,outPath).compile(watch);
      }
    }catch(ex){
      console.error(ex.message);
      console.error(ex.stack);
    }
  }
  constructor(config){
    this.config = config;
  }
  isSource(file){
    return ['js'].indexOf(file.ext)>=0;
  }
  isIgnored(file){
    if(this.config.whitelist){
      return this.config.whitelist.indexOf(file.ext)==-1;
    }else
    if(this.config.blacklist){
      return this.config.blacklist.indexOf(file.ext)!=-1;
    }else{
      return file.ext && file.ext.match(/^.*(bak|log|temp).*$/gi);
    }
  }
  compile(watch){
    watch = this.config.watch = (this.config.watch || watch);
    var sources=[], resources=[];
    var out = this.config.outPath;
    var root = this.config.srcPath;
    var files = Files.readDirRecursive(root);
    files.forEach(f=>{
      var file = this.file(f);
      switch(file.type){
        case 'source'   : sources.push(file); break;
        case 'resource' : resources.push(file); break;
        case 'ignore'   : console.info('ignored '+file.path); break;
      }
    });

    this.project = Project.compile(this.config,sources);

    sources.forEach(file=>{
      if(file.output){
        Files.writeFile(Files.resolve(out,file.path),file.output); //code
      }
    });
    resources.forEach(file=>{
      Files.copyFile(file.file,Files.resolve(out,file.path));
    });
    Files.writeFile(Files.resolve(out,'project.json'),JSON.stringify(this.config,null,'  '));
    if(watch){
      this.watch();
    }
  }
  file(f){
    var root = this.config.srcPath;
    var file = {
      file : f,
      path : Files.relative(root,f),
      type : 'resource',
      ext  : Files.extension(f)
    };
    if(file.path == 'index.json'){
      file.type = 'project';
      return true;
    } else
    if(this.isIgnored(file)){
      file.type = 'ignore';
    } else
    if(this.isSource(file)){
      file.type = 'source';
      file.name = file.path.replace(new RegExp('^(.*)\\.'+file.ext+'$'),'$1');
      file.source = Files.readFile(file.file);
    }
    return file;
  }
  watch(){
    console.info("Watching "+this.config.group+':'+this.config.project);
    this.watcher = Files.watch(this.config.srcPath,{
      persistent: true,
      recursive: true
    },(e,f)=>this.onFileChange(e,f));
  }
  onFileChange(e,f){
    f = Files.resolve(this.config.srcPath,f);
    if(Files.isFile(f)){
      var out = this.config.outPath;
      var file = this.file(f);
      console.info('changed '+this.config.group+':'+this.config.project+' '+file.path);
      switch(file.type){
        case 'source'   :
          this.project.compileSource(file);
          if(file.output){
            Files.writeFile(Files.resolve(out,file.path),file.output);
          }
        break;
        case 'resource' :
          Files.copyFile(file.file,Files.resolve(out,file.path));
        break;
        case 'ignore'   : console.info('ignored '+file.path); break;
      }
    }

  }
}


Compiler.run();
