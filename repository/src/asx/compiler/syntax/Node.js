import {Entity} from '../util/Entity.js';
import {Token,TokenType} from '../syntax/Token';
export class Node extends Entity {
    static get TYPE(){
        return this;
    }
    static is(node,...types){
        for(var type of types){
            if(node instanceof Token){
                return (node.type == type);
            } else
            if(typeof type=='function'){
                if(node.constructor == type){
                    return true;
                }else
                if(type.name==''){
                    return type(node);
                }
            }else
            if(typeof type=='string'){
                if(node.name == type){
                    return true;
                }
            }
        }
        return false;
    }
    get type(){
        return this.constructor;
    }
    get name(){
        return this.type.name.substring(0,this.type.name.length-4)
    }
    get attributes(){
        return false;
    }
    get source(){
        return (this.$.source || this.parent.source);
    }
    set source(v){
        return this.$.source=v;
    }
    get parent():Node{
        return this.$.parent;
    }
    set parent(v:Node){
        this.$.parent = v;
    }
    get index():Number{
        return this.$.index;
    }
    set index(v:Number){
        this.$.index = v;
    }
    get length():Number{
        return this.children.length;
    }
    get children():Array{
        if(!this.$.children){
            this.$.children=[]
        }
        return this.$.children;
    }
    get first():Node{
        return this.children[0];
    }
    get last():Node{
        return this.children[this.length-1];
    }
    get next():Node{
        return this.parent.get(this.index+1);
    }
    get previous():Node{
        return this.parent.get(this.index-1);
    }

    get range(){
        return (this.$.range || [
            this.first ? this.first.range[0]:NaN,
            this.last  ? this.last.range[1]:NaN
        ]);
    }
    get location(){
        return (this.$.location || {
            start   : this.first?this.first.location.start:NaN,
            end     : this.last?this.last.location.end:NaN
        });
    }
    get text(){
        if(!this.$.text){
            this.$.text = this.source.content.substring(
                this.range[0],this.range[1]
            );
        }
        return this.$.text;
    }
    get value(){
        return this.text;
    }
    find(name) {
        var result = this.children.filter((child)=> {
            return Node.is(child,name);
        });
        if(!result.length && (name instanceof TokenType)){
            result.push(name);
        }
        return result;
    }
    get(name){
        if(typeof name=='number'){
            return this.children[name];
        }
        for(var child of this.children){
           if(Node.is(child,name)){
               return child;
           }
        }
        if(name instanceof TokenType){
            return name;
        }
    }
    add(child){
        if(Array.isArray(child)){
            for(var c of child){
                this.add(c);
            }            
        } else {
            child.parent = this;
            child.index  = this.children.push(child)-1;
            return child;
        }
    }
    remove(child){
        this.$.children = this.children.filter((c)=>{
            return c!==child;
        })
    }
    replace(child,replacement){
        var children = [];
        this.children.forEach((c)=>{
            if(c===child){
                if(Array.isArray(replacement)){
                    children.push(...replacement)
                }else{
                    children.push(replacement)
                }
            }else{
                children.push(c)
            }
        });
        this.$.children = children;
    }
    inspect(){
        return this.toString();
    }
    toString() {
        return this.toXML();
    }
    toJSON(){
        var node = AstNode.merge({
            type : this.type.name
        },this.$);
        delete node.location;
        return node;
    }
    is(...types){
        return Node.is(this,...types);
    }
    toXML(l=1,positions=false,tokens=true){
        var tab = Entity.repeat(l);
        var lst = [];
        var sLoc = `${this.location.start.line}:${this.location.start.column}`;
        var eLoc = `${this.location.end.line}:${this.location.end.column}`;
        var loc  = positions?` pos="${this.range.join('-')}" loc="${sLoc}-${eLoc}"`:'';
        var att  = this.attributes;
        if(att){
            var list = [];
            for(var key in att){
                list.push(`${key}=${JSON.stringify(att[key].toString())}`);
            }
            att = list.join(' ');
        }
        lst.push(`${tab}<${this.name}${loc}${att?' '+att:''}>`);
        for(var child of this.$.children){
            if(child){
                if(tokens || (child instanceof Node)){
                    lst.push(child.toXML(l+1,positions,tokens));
                }
            }else{
                lst.push('<ERROR>');
            }
        }
        if(lst.length>1){
            lst.push(`${tab}</${this.name}>`);
        }else{
            lst[0]=lst[0].substring(0,lst[0].length-1)+'/>'
        }

        return lst.join('\n')
    }
    build(){
        this.$.range    = this.range;
        this.$.location = this.location;
        var children = this.children.filter((child)=>{
            if(child instanceof Node){
                child.build();
                return true;
            }else{
                return false;
            }
        });
        this.$.children = [];
        children.forEach((child)=>{
            this.add(child);
        });
        return this;
    }
    normalize(){}
    cache(name,init,...params){
        if(!this.$.cache){
            this.$.cache={}
        }
        if(!this.$.cache[name]){
            this.$.cache[name] = init(...params);
        }
        return this.$.cache[name];
    }
    clear(name){
        if(name){
            delete this.$.cache[name];
        }else{
            this.$.cache;
        }
    }
}
