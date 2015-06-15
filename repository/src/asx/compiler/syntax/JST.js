import {Source} from './Source'
import {Visitor} from './Visitor'
import {Options} from '../Options'


export class JST {
    static statement(tpl:Array,...args:Array){
        var params = {};
        var template = [tpl.shift()];
        for(var  i=0;i<args.length;i++){
            var name = "E6_$"+i;
            params[name] = args[i];
            template.push(name);
            template.push(tpl.shift());
        }
        var tree = JST.parseStatement(template.join(''));
        var visitor = new JSTVisitor(params);
        visitor.visit(tree);
        return tree;
    }
    static parseStatement(content){
        var parser = new JST.Parser(new Source({
            content : content,
            options : new Options({}),
            name    : 'template'
        }));
        parser.parseStatement();

        var tree = parser.builder.tree;
        tree.source = parser.source;
        return tree.build();
    }
}

class JSTVisitor extends Visitor {
    constructor(params){
        super();
        this.params = params;
    }
    visit(node:IdentifierNode){
        if(this.params[node.text]){
            node.parent.replace(node,this.params[node.text]);
        }else{
            super.visit(node)
        }
    }
}