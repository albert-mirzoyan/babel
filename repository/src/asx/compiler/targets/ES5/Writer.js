import {Visitor} from '../../syntax/Visitor'
import {Ast} from '../../syntax/Ast'
import {Node} from '../../syntax/Node'
import {SourceMapConsumer} from '../../mapping/Consumer'
import {Token,TokenType} from '../../syntax/Token'
import Path from 'path'

export class Writer extends Visitor {
    static write(source:Source){
        var sources = [];
        if(source.isMain){
            sources.push(new Writer().write(source));
            //console.info(source.output);
        }
    }
    get source():Source{
        return this.$.source
    }
    write(source){
        
        this.set({
            line    : '',
            lines   : 1,
            indent  : 0,
            maps    : {},
            pretty  : true,
            source  : source,
            exports : []
        });

        this.writeSource(this.source);

        this.out("//# sourceMappingURL=").out(this.source.mapFile).NL;

        this.source.write();
        return this.source;
    }
    writeSource(source){
        source.children.forEach((child)=>{
            this.writeSource(child);
        });
        console.info(source.ast);
        this.visit(source.ast);
    }
    out(value,...other) {
        if (value === null) return;
        
        if (this.$.pretty && this.$.line.length === 0) {
            var indent = '';
            for (var i = 0; i < this.$.indent; i++) {
                indent+='  ';
            }
            this.writeRaw(indent);
        }
        this.writeRaw(value);
        if(other.length){
            other.forEach((item)=>{
                this.out(item);
            })
        }
        return this;
    }
    writeRaw(value){
        if(value instanceof Node){
            //this.$.last = value;
            //this.mapStart(value);
            this.$.line += value.text;
            //this.mapEnd(value);
        }else
        if(value instanceof TokenType){
            //this.mapStart(this.$.last);
            this.$.line += value.text;
            //this.mapEnd();
        }else
        if(typeof value=='string'){
            //this.mapStart(this.$.last);
            this.$.line += value;
            //this.mapEnd() 091017712
        }
    }
    mapStart(node:Node,name:String){
        //console.info(this.$.lines+':'+this.$.line.length+' > '+node.location.start.line+':'+node.location.start.column+' '+node.source.name)
        this.source.map.addMapping({
            source      : './'+node.source.name,
            generated   : {
                line    : this.$.lines,
                column  : this.$.line.length
            },
            original    : {
                line    : node.location.start.line,
                column  : node.location.start.column
            },
            name        : name
        });
        return this;
    }
    mapEnd(node:Node){
        this.source.map.addMapping({
            source: './' + node.source.name,
            generated: {
                line    : this.$.lines,
                column  : this.$.line.length
            },
            original: {
                line: node.location.end.line,
                column: node.location.end.column
            }
        });
        return this;
    }

    get INC(){
        this.$.indent++;
        return this;
    }
    get DEC(){
        this.$.indent--;
        return this;
    }
    get NL(){
        //this.mapStart();
        this.source.output = this.source.output+this.$.line+(this.$.pretty?'\n':'');
        this.$.lines++;
        this.$.line='';
        //this.mapEnd();
        return this;
    }
    // visitors
    visit(node:Node){

        if(!node) return;
        if(Array.isArray(node)){
            for(var child of node){
                this.visit(child);
            }
        }else{
            //this.mapStart(node);
            super.visit(node);
            //this.mapEnd(node);
        }

        return this;
    }
    visitModule(node:ModuleNode){
        //node.normalize();
        this.out('/*',node.source.sourcePath,'*/').NL;
        this.mapStart(node).out('E6("',node.source.project.options.name,'/',node.specifier,'",function(E6){with(this){').NL;
        this.INC;
        this.visit(node.children);
        this.DEC;
        this.out("}});").mapEnd(node).NL;
    }
    visitModuleSpecifier(node:ModuleSpecifierNode){
        this.mapStart(node).out(node).mapEnd(node);
    }
    visitImportDeclaration(node:ImportDeclarationNode){
        this.mapStart(node).out("E6.I(").visit(node.specifier).out(");").mapEnd(node).NL;
    }
    visitExportDeclaration(node:ExportDeclarationNode){
        //this.$.exports.push(node.declaration.declarator);
        //this.visit(node.declaration);
    }
    visitName(node:NameNode){
        this.mapStart(node,node.text).out(node).mapEnd(node);
    }

    visitFunctionExpression(node:FunctionExpressionNode){
        this.mapStart(node).out('function').visit(node.signature).visit(node.body);
    }
    visitClassDeclaration(node:ClassDeclarationNode){
        //this.mapStart(node);
        this.mapStart(node).out('E6.C(').out('"').visit(node.nodeName).out('"').out(',function(E6){').NL;
        this.INC;
        
        if(node.nodeParent){
            this.mapStart(node.nodeParent)
                .out('E6.P(').visit(node.nodeParentType).out(');')
            .mapEnd(node.nodeParent).NL;
        }else{
            this.out('E6.P(Object);').NL;
        }
        
        this.visit(node.nodeConstructor);
        this.visit(node.nodeFields);
        this.visit(node.nodeMethods);

        this.visit(node.nodeStaticFields);
        this.visit(node.nodeStaticMethods);
        this.visit(node.nodeInitializer);
        
        this.DEC;
        this.out('});').mapEnd(node).NL;
        //this.mapEnd(node);
    }

    visitClassConstructor(node:ClassConstructorNode){
        //this.mapStart(node);
        this.mapStart(node)
            .out('E6.C(').out(node.modifiers.toString()).out(',function').visit(node.signature)
                .visit(node.body)
            .out(');')
        .mapEnd(node).NL;
        //this.mapEnd(node);
    }
    visitClassMethod(node:ClassMethodNode){
        //this.mapStart(node);
        this.mapStart(node).out('E6.M(').out(node.modifiers.toString()).out(',');
        this.out('"').visit(node.declarator).out('"');
        this.out(',function').visit(node.signature).visit(node.body).out(');').mapEnd(node).NL;
        //this.mapEnd(node);
    }
    visitBlock(node:BlockNode){
        this.out('{').mapStart(node).NL;
        this.INC;
        this.visit(node.children);
        this.DEC;
        this.mapEnd(node).out('}');
    }
    visitClassField(node:ClassFieldNode){
        //this.mapStart(node);
        this.out('E6.F(').out(node.modifiers.toString()).out(',');
        this.out('"').visit(node.nodeName).out('"');
        this.out(');').NL;
        //this.mapEnd(node);
    }
    visitClassGetter(node:ClassGetterNode){
        //this.mapStart(node);
        this.out('E6.G(');
        this.out('"').visit(node.declarator).out('"');
        this.out(',function').visit(node.signature).visit(node.body).out(');').NL;
        //this.mapEnd(node);
    }
    visitClassSetter(node:ClassSetterNode){
        //this.mapStart(node);
        this.out('E6.S(');
        this.out('"').visit(node.declarator).out('"');
        this.out(',function').visit(node.signature).visit(node.body).out(');').NL;
        //this.mapEnd(node);
    }
    visitSignature(node:SignatureNode){
        this.mapStart(node).out('(').visit(node.parameters).out(')').mapEnd(node);
    }
    visitParameter(node:ParameterNode){
        this.visit(node.declarator);
    }
    visitIdentifier(node:IdentifierNode){
        this.mapStart(node,node.text).out(node).mapEnd(node);
    }
    visitCallArguments(node:CallArgumentNode){
        this.mapStart(node).out('(');
        node.children.forEach((c,i,a)=>{
            if(i>0){
                this.out(',');
            }
            this.visit(c);
        });
        this.out(')').mapEnd(node);
    }
    visitMemberExpression(node:MemberExpressionNode){
        this.visit(node.first).out('.').visit(node.last);
    }
    visitExpressionStatement(node:ExpressionStatementNode){
        //this.mapStart(node);
        this.visit(node.first).out(';').NL;
        //this.mapEnd(node);
    }
    visitSumExpression(node:SumExpressionNode){
        this.visit(node.first).out('+').visit(node.last);
    }
    visitAssignmentExpression(node:AssignmentExpressionNode){
        this.visit(node.first).out('=').visit(node.last);
    }
    visitNewExpression(node:NewExpressionNode){
        this.mapStart(node).out('new ').visit(node.first).visit(node.last).mapEnd(node);
    }
    visitReturn(node:ReturnNode){
        this.mapStart(node).out('return ').visit(node.first).out(';').mapEnd(node).NL;
    }
    visitString(node:ParameterNode){
        this.mapStart(node).out(node).mapEnd(node);
    }
    visitSuper(node:SumExpressionNode){
        this.mapStart(node).out('this.').out(node).mapEnd(node);
    }
    visitThis(node:SumExpressionNode){
        this.mapStart(node).out(node).mapEnd(node);
    }
}