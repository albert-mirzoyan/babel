import {Entity} from '../util/Entity';
import {Scanner} from './Scanner';
import {Token} from './Token';
import {Ast} from './Ast';

class Marker extends Entity {
    static get START(){
        return 1;
    }
    static get TOKEN(){
        return 2;
    }
    static get DONE(){
        return 3;
    }

    get type():Number{
        return this.$.type;
    }
    get index():Number{
        return this.$.index;
    }
    get builder():Builder{
        return this.$.builder;
    }
    get node():Function{
        return this.$.node;
    }
    get token():Token{
        return this.$.token;
    }
    get left():Marker{
        return this.builder.left(this);
    }
    get right():Marker{
        return this.builder.right(this);
    }
    get start():Marker{
        switch(this.type){
            case Marker.START : return this;
            case Marker.TOKEN : return this;
            case Marker.DONE  : return this.$.pair;
        }
    }
    get end():Marker{
        switch(this.type){
            case Marker.START : return this.$.pair;
            case Marker.TOKEN : return this;
            case Marker.DONE  : return this;
        }
    }
    get tree(){
        return this.builder.build(this);
    }
    constructor(settings){
        super(settings);
    }
    done(node){
        if(node){
            this.$.node = node;
        }
        return this.builder.done(this,node);
    }
    rollback(){
        return this.builder.rollback(this);
    }
    collapse(type){
        return this.builder.collapse(this,type);
    }
    shift(type){
        if(type) {
            if (this.left &&this.left.node == type) {
                this.builder.shift(this);
            }
        }else{
            this.builder.shift(this);
        }
    }
    toJSON(){
        return this.type;
    }
    inspect(){
        switch (this.type){
            case Marker.START : return "S:"+this.node.name;
            case Marker.DONE  : return "E:"+this.node.name;
            case Marker.TOKEN : return "T:"+(this.token?this.token.type:"NONE");
        }
    }
}

export class Builder extends Entity {
    get source(){
        return this.$.source;
    }
    get options(){
        return this.$.options;
    }
    get parser(){
        return this.$.parser;
    }
    get scanner(){
        return this.$.scanner;
    }
    get stack(){
        return this.$.stack
    }
    get lookahead(){
        return this.$.lookahead;
    }
    get token(){
        if(!this.$.token){
            if(this.lookahead.length){
                this.$.token = this.lookahead.shift();
            }else{
                this.$.token = this.scanner.nextToken()
            }
        }
        if(this.$.token.type==Token.SLASH || this.$.token.type==Token.SLASH_EQUAL){
            if(this.stack.peek.node && this.stack.peek.type == Marker.START && this.stack.peek.node == Ast.RegexpExpression){
                this.scanner.regexp(true);
                this.$.token = this.scanner.nextToken();
            }
        }
        return this.$.token;
    }
    get tree(){
        return this.build(this.stack[0]);
    }
    get parent(){
        return this.stack.peek
    }
    constructor({source,options,parser}) {
        super({source,options,parser})
        this.set('parser',parser);
        this.set('stack',[]);
        this.set('lookahead',[]);
        this.set('scanner',new Scanner(source));
        Object.defineProperty(this.stack,'peek',{
            get:function(){
                return this[this.length-1];
            }
        })
    }
    inside(node){
        return this.parent && this.parent.node==node;
    }
    eat(type:Function){
        if(this.token.type==type){
            var marker = this.stack[this.stack.push(
                new Marker({
                    type    : Marker.TOKEN,
                    index   : this.stack.length,
                    builder : this,
                    token   : this.token
                })
            )-1];
            delete this.$.token;
            return marker;
        }else{
            this.error(`Expected token ${type} for token ${this.token.type}`);
        }
    }
    build(marker:Marker){
        for(var node=new marker.node(),current,i=marker.start.index+1;i<marker.end.index;i++){
            current = this.stack[i];
            switch(current.type){
                case Marker.START :
                    node = node.add(new current.node({
                        parent:node
                    }));
                    break;
                case Marker.DONE :
                    node = node.parent || node;
                    break;
                case Marker.TOKEN :
                    node.children.push(current.token);
                    break;
            }
        }
        return node;
    }
    left(marker:Marker):Marker{
        if(this.stack[marker.start.index-1]){
            return this.stack[marker.start.index-1].start;
        }
    }
    right(marker:Marker):Marker{
        return this.stack[marker.end.index+1].end;
    }
    rollback(marker:Marker) {
        var stack = this.stack.splice(marker.start.index);
        var picked = false;
        for (var current of stack) {
            if (current.type == Marker.TOKEN) {
                picked = true;
                this.lookahead.push(current.token);
            }
        }
        if (picked) {
            this.lookahead.push(this.token);
            delete this.$.token;
        }
        return false;
    }
    collapse(marker:Marker,node:Function){
        var encloser = new Marker({
            type    : Marker.START,
            index   : 0,
            builder : this,
            node    : node
        });
        this.stack.splice(marker.start.index,0,encloser);
        for(var i=marker.start.index;i<this.stack.length;i++){
            this.stack[i].$.index = i;
        }
        return encloser.done(node);
    }
    shift(marker:Marker){
        var left = marker.left.start;
        this.stack.splice(marker.start.index,1);
        this.stack.splice(marker.left.start.index,0,marker.start);
        for(var i=left.index;i<this.stack.length;i++){
            this.stack[i].$.index = i;
        }
    }
    mark(node:Function):Marker{
        if(!(node instanceof Function)){
            this.error(`Unexpected Marker Type`);
        }
        return this.stack[this.stack.push(
            new Marker({
                type    : Marker.START,
                index   : this.stack.length,
                builder : this,
                node    : node
            })
        )-1];
    }
    done(marker:Marker,node:Function):Marker{
        node = node || marker.node;
        if(!(node instanceof Function)){
            this.error(`Unexpected Marker Type`);
        }
        return marker.$.pair = this.stack[this.stack.push(
            new Marker({
                type    : Marker.DONE,
                index   : this.stack.length,
                builder : this,
                node    : node || marker.node,
                pair    : marker
            })
        )-1];
    }
    error(message){
        throw new Error(message);
    }
}