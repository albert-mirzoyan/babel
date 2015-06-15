// Copyright 2012 Traceur Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Entity} from '../util/Entity';
import {Utils} from '../util/Utils';
import {Unicode} from './Unicode';
import {SourceMapGenerator} from '../mapping/Generator'

import Path from 'node/path';
import FS from 'node/fs';

/**
 * A source file.
 *
 * Immutable.
 */
export class Source extends Entity {
    constructor(settings) {
        super(Entity.merge({
            lastLine    : 0,
            lastOffset  : -1
        }, settings));
    }
    get isMain(){
        return this.get('main',false);
    }
    get options(){
        return this.get('options');
    }
    get project(){
        return this.get('project');
    }
    get sourcePath(){
        return this.get('sourcePath',Path.resolve(this.project.sourceRoot,this.name));
    }
    get sourceDir(){
        return Path.dirname(this.sourcePath);
    }
    get outputName(){
        return Path.basename(this.name,'.js')+'.out.js';
    }
    get outputPath(){
        return this.get('outputPath',Path.resolve(this.project.outputRoot,this.outputName));
    }
    get outputDir(){
        return Path.dirname(this.outputPath);
    }
    get mapPath(){
        return this.outputPath+'.map';
    }
    get mapFile(){
        return Path.relative(this.outputDir,this.mapPath);
    }
    get name() {
        return this.get('name');
    }
    get map(){
        if(!this.$.map){
            this.$.map = new SourceMapGenerator({
                file        : './'+Path.basename(this.outputName),
                sourceRoot  : Path.relative(this.outputDir,this.sourceDir)
            })
        }
        return this.$.map;
    }
    get content() {
        return this.get('content',()=>FS.readFileSync(this.sourcePath,'utf8'));
    }
    set output(v){
        this.$.output=v;
    }
    get output(){
        return this.$.output||'';
    }
    get table() {
        Object.defineProperty(this, 'table', {
            value: ((source)=> {
                var offsets = [0];
                var k = 1;
                for (var index = 0; index < source.length; index++) {
                    var code = source.charCodeAt(index);
                    if (Unicode.isLineTerminator(code)) {
                        if (code === 13) {  // \r
                            if (source.charCodeAt(index + 1) === 10) {// \n
                                index++;
                            }
                        }
                        offsets[k++] = index;
                    }
                }
                offsets[k++] = source.length;
                return offsets;
            })(this.content)
        });
        return this.table;
    }
    get ast():ModuleNode {
        return this.$.ast;
    }
    set ast(v:ModuleNode) {
        this.$.ast = v;
    }
    get children(){
        return this.dependencies.map((dependency)=>{
            return this.project.getSource(dependency)
        })        
    }
    get dependencies(){
        return this.get('dependencies',()=>{
            return this.ast.imports.map((dependency)=>{
                return this.resolve(dependency);
            })
        })
    }
    inspect(){
        return 'Source('+this.name+')';
    }
    resolve(dependency){
        if(dependency.indexOf('.')==0){
            if(Path.extname(dependency)!='.js'){
                dependency = dependency+'.js'
            }
            return Path.resolve(this.sourceDir,dependency);
        }else{
            return dependency;
        }
    }
    write(){
        Utils.makeDirectories(this.outputDir);
        console.info(this.mapPath);
        FS.writeFileSync(this.outputPath,this.output.toString(),'utf8');
        FS.writeFileSync(this.mapPath,this.map.toString(),'utf8');
    }
    getPosition(offset) {
        if (offset <= 0) {
            return {line: 1, column: 0}
        } else {
            var line, column;
            for (line = 0; line < this.table.length; line++) {
                if (offset <= this.table[line]) {
                    break;
                }
            }
            column = offset - this.table[line - 1];
            return {line: line, column: line>1?column-1:column};
        }
    }
    getLocation(startOffset, endOffset) {
        return {
            start: this.getPosition(startOffset),
            end: this.getPosition(endOffset)
        }
    }
}