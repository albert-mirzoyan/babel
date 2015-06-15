import {Node}           from './Node';
import {JST}            from './JST';
import {ValueParser}    from '../util/ValueParser';

export class Ast {
    static get Annotation                   (){return AnnotationNode              ;}
    static get Annotations                  (){return AnnotationsNode             ;}
    static get Argument                     (){return CallArgumentNode            ;}
    static get Arguments                    (){return CallArgumentsNode           ;}
    static get ArrayLiteral                 (){return ArrayNode                   ;}
    static get ArrayElement                 (){return ArrayElementNode            ;}
    static get ArrowExpression              (){return ArrowNode         ;}
    static get AssignmentExpression         (){return AssignmentExpressionNode         ;}
    static get SumExpression                (){return SumExpressionNode        ;}
    static get SubExpression                (){return SubExpressionNode        ;}
    static get MulExpression                (){return MulExpressionNode        ;}
    static get DivExpression                (){return DivExpressionNode        ;}
    static get ModExpression                (){return ModExpressionNode        ;}
    static get BlockStatement               (){return BlockNode                    ;}
    static get BreakStatement               (){return BreakNode                   ;}
    static get BooleanExpression            (){return BooleanNode                 ;}
    static get CallExpression               (){return CallExpressionNode                    ;}
    static get CaseClause                   (){return SwitchCaseNode              ;}
    static get Catch                        (){return TryCatchNode                ;}
    static get ClassBody                    (){return ClassBodyNode               ;}
    static get ClassDeclaration             (){return ClassDeclarationNode                   ;}
    static get ClassName                    (){return ClassNameNode               ;}
    static get ClassParent                  (){return ClassParentNode             ;}
    static get ClassField                   (){return ClassFieldNode              ;}
    static get ClassGetter                  (){return ClassGetterNode             ;}
    static get ClassMethod                  (){return ClassMethodNode             ;}
    static get ClassConstructor             (){return ClassConstructorNode        ;}
    static get ClassSetter                  (){return ClassSetterNode             ;}
    static get ConditionalExpression        (){return ConditionalNode   ;}
    static get ContinueStatement            (){return ContinueNode       ;}
    static get DebuggerStatement            (){return DebuggerNode       ;}
    static get DefaultImport                (){return DefaultImportNode           ;}
    static get DefaultClause                (){return DefaultClauseNode           ;}
    static get DoWhileStatement             (){return DoNode        ;}
    static get EmptyStatement               (){return EmptyNode          ;}
    static get ExportDeclaration            (){return ExportDeclarationNode       ;}
    static get ExportSpecifier              (){return ExportSpecifierNode         ;}
    static get ExpressionStatement          (){return ExpressionStatementNode     ;}
    static get Finally                      (){return TryFinallyNode                 ;}
    static get ForSignature                 (){return ForSignatureNode            ;}
    static get ForStatement                 (){return ForNode            ;}
    static get FormalParameter              (){return ParameterNode         ;}
    static get FormalSignature              (){return SignatureNode         ;}
    static get FunctionDeclaration          (){return FunctionDeclarationNode     ;}
    static get FunctionExpression           (){return FunctionExpressionNode      ;}
    static get Identifier                   (){return IdentifierNode              ;}
    static get IfStatement                  (){return IfNode             ;}
    static get Initializer                  (){return InitializerNode             ;}
    static get ImportDeclaration            (){return ImportDeclarationNode       ;}
    static get ImportSpecifier              (){return ImportSpecifierNode         ;}
    static get MemberExpression             (){return MemberExpressionNode        ;}
    static get Modifier                     (){return ModifierNode                ;}
    static get Modifiers                    (){return ModifiersNode               ;}
    static get Module                       (){return ModuleNode                  ;}
    static get ModuleBlock                  (){return ModuleBlockNode         ;}
    static get ModuleSpecifier              (){return ModuleSpecifierNode         ;}
    static get NanExpression                (){return NanNode           ;}
    static get Name                         (){return NameNode         ;}
    static get NamespaceImport              (){return NamespaceImportNode         ;}
    static get NamespaceExport              (){return NamespaceExportNode         ;}
    static get NewExpression                (){return NewExpressionNode           ;}
    static get NullExpression               (){return NullNode          ;}
    static get NumberExpression             (){return NumberNode        ;}
    static get ObjectExpression             (){return ObjectNode        ;}
    static get ObjectProperty               (){return ObjectElementNode          ;}
    static get ParenExpression              (){return ParenNode         ;}
    static get PostfixExpression            (){return PostfixNode       ;}
    static get RegexpExpression             (){return RegexpNode        ;}
    static get ReturnStatement              (){return ReturnNode        ;}
    static get Reference                    (){return ReferenceNode     ;}
    static get SequenceExpression           (){return SequenceNode      ;}
    static get StringExpression             (){return StringNode        ;}
    static get SuperExpression              (){return SuperNode         ;}
    static get SwitchStatement              (){return SwitchNode         ;}
    static get TemplateExpression           (){return TemplateNode      ;}
    static get ThisExpression               (){return ThisNode          ;}
    static get ThrowStatement               (){return ThrowNode          ;}
    static get TryStatement                 (){return TryNode            ;}
    static get TypeReference                (){return TypeReferenceNode ;}
    static get UnaryExpression              (){return UnaryNode         ;}
    static get UndefinedExpression          (){return UndefinedNode     ;}
    static get VariableDeclarations         (){return VariableDeclarationsNode     ;}
    static get VariableDeclaration          (){return VariableNode      ;}
    static get WhileStatement               (){return WhileNode          ;}
    static get WithStatement                (){return WithNode           ;}
}

class AnnotationNode                        extends Node {}
class AnnotationsNode                       extends Node {}
class ClassDeclarationNode                  extends Node {
    get nodeName():NameNode{
        return this.get(Ast.ClassName).get(Ast.Name)
    }
    get nodeBody():ClassBodyNode{
        return this.get(Ast.ClassBody);
    }
    get nodeParent():ClassParentNode{
        return this.get(Ast.ClassParent)
    }
    get nodeParentType():TypeReferenceNode{
        return this.nodeParent.get(Ast.TypeReference);
    }
    get nodeConstructor():ClassConstructorNode {
        return this.nodeBody.get((node)=>{
            if(Node.is(node,Ast.ClassConstructor)){
                return !node.isStatic;
            }
        });
    }
    get nodeInitializer():ClassConstructorNode{
        return this.nodeBody.get((node)=>{
            if(Node.is(node,Ast.ClassConstructor)){
                return node.isStatic;
            }
        });
    }
    get nodeFields():Array{
        var staticFields = {};
        var objectFields = {};
        this.nodeBody.find(Ast.ClassField).forEach((field)=>{
            this.nodeBody.remove(field);
            var name   = field.nodeName.value;
            var fields = field.isStatic ? staticFields:objectFields;
            if(!fields[name]){
                fields[name] = field
            } else {
                throw new Error('duplicate field definition');
            }
        });
        this.nodeBody.find(Ast.ClassGetter).forEach((getter)=>{
            this.nodeBody.remove(getter);
            var name   = getter.nodeName.value;
            var fields = getter.isStatic ? staticFields:objectFields;
            if(!fields[name]){
                fields[name] = new ClassFieldNode();
                fields[name].add(getter.nodeName);
                fields[name].add(getter.nodeName);
            }
            if(!fields[name].nodeGetter){
                fields[name].add(getter);
            }else{
                throw new Error('duplicate getter definition');
            }
        });
        this.nodeBody.find(Ast.ClassSetter).forEach((setter)=>{
            this.nodeBody.remove(setter)
            var name   = setter.nodeName.value;
            var fields = setter.isStatic ? staticFields:objectFields;
            if(!fields[name]){
                fields[name] = new ClassFieldNode();
            }
            if(!fields[name].nodeSetter){
                fields[name].add(setter);
            }else{
                throw new Error('duplicate setter definition');
            }
        });
        Object.keys(staticFields).forEach((key)=>{
            this.nodeBody.add(staticFields[key]);
        });
        Object.keys(objectFields).forEach((key)=>{
            this.nodeBody.add(objectFields[key]);
        });
        return this.nodeBody.find(Ast.ClassField);
    }
}
class ClassMember                           extends Node {
    get nodeName():NameNode{
        return this.get(Ast.Name)
    }
    get nodeModifiers():ModifiersNode {
        var modifiers = this.get(Ast.Modifiers);
        if(!modifiers){
            modifiers = new ModifiersNode();
        }
        return modifiers;
    }
    get modifiers(){
        return this.nodeModifiers.mask;
    }
    get isStatic(){
        return this.nodeModifiers.isStatic;
    }
    get isPublic(){
        return this.nodeModifiers.isPublic;
    }
}
class ClassNameNode                         extends Node {}
class ClassParentNode                       extends Node {}
class ClassBodyNode                         extends Node {}
class ClassFieldNode                        extends ClassMember {
    get nodeName(){
        if(!super.nodeName){
            if(this.nodeGetter){
                return this.nodeGetter.nodeName
            }
            if(this.nodeSetter){
                return this.nodeGetter.nodeName
            }
            throw new Error('unnamed class field');
        }else{
            return super.nodeName;
        }
    }
    get nodeGetter(){
        return this.cache('nodeGetter',()=>this.get(Ast.ClassGetter));
    }
    get nodeSetter(){
        return this.cache('nodeSetter',()=>this.get(Ast.ClassSetter));
    }
}

class ClassMethodNode                       extends ClassMember {
    get signature(){
        return this.get(Ast.FormalSignature)
    }
    get body(){
        return this.get(Ast.BlockStatement)
    }
}
class ClassConstructorNode                  extends ClassMethodNode {

}
class ClassGetterNode                       extends ClassMethodNode {}
class ClassSetterNode                       extends ClassMethodNode {}

class DefaultImportNode                     extends Node {}
class DefaultClauseNode                     extends Node {}
class ExportDeclarationNode                 extends Node {
    get declaration():NameNode{
        return this.first;
    }
    
}
class ExportSpecifierNode                   extends Node {}
class ParameterNode                         extends Node {
    get declarator():NameNode{
        return this.get(Ast.Name);
    }
}
class SignatureNode                         extends Node {
    get parameters(){
        return this.find(Ast.FormalParameter);
    }
}
class FunctionDeclarationNode               extends Node {
    get signature(){
        return this.get(Ast.FormalSignature)
    }
    get body(){
        return this.get(Ast.BlockStatement)
    }
    
}

class InitializerNode                       extends Node {}
class ImportDeclarationNode                 extends Node {
    get specifier(){
        return this.get(Ast.ModuleSpecifier);
    }
}
class ImportSpecifierNode                   extends Node {}

class ModifierNode                          extends Node {}
class ModifiersNode                         extends Node {
    get mask(){
        var mask = 0;
        this.find(Ast.Modifier).forEach((mod)=>{
            switch(mod.value){
                case 'static' : mask = mask | 1; break;
                case 'public' : mask = mask | 2; break;
            }
        });
        return mask;
    }
    get isStatic(){
        return (1 == (this.mask|1));
    }
    get isPublic(){
        return (2 == (this.mask|2));
    }
}
class ModuleNode                            extends Node {
    get specifier(){
        return this.source.name;
    }
    get imports(){
        return this.find(Ast.ImportDeclaration).map((declaration)=>{
            return declaration.specifier.value;
        });
    }
    normalize(){
        var variables=[],classes=[],functions=[],statements=[],imports=[],exports=[];
        this.children.forEach(child=>{
            switch(child.type){
                case Ast.ExportDeclaration      :
                    exports.push(child);
                break;
                case Ast.ImportDeclaration      :
                    imports.push(child);
                break;
                case Ast.ClassDeclaration       :
                    classes.push(child);
                break;
                case Ast.FunctionDeclaration    :
                    functions.push(child);
                break;
                case Ast.VariableDeclarations   :
                    variables.push(child);
                break;
                default                         : 
                    statements.push(child)
            }
        });
        console.info(statements)
        var initializer = (JST.statement `E6.M(function(){${statements}});`);
        this.$.children = [new ModuleBlockNode()]
    }
}

class NamespaceImportNode                   extends Node {}
class NamespaceExportNode                   extends Node {}

class TypeReferenceNode                     extends Node {}
// General
class Definition                            extends Node {}
// Statements
class Statement                             extends Node {}
class EmptyNode                             extends Statement {}
class BreakNode                             extends Statement {}
class ContinueNode                          extends Statement {}
class DebuggerNode                          extends Statement {}
class ThrowNode                             extends Statement {}
class ReturnNode                            extends Statement {}
class WhileNode                             extends Statement {}
class DoNode                                extends Statement {}
class WithNode                              extends Statement {}
class SwitchNode                            extends Statement {}
class SwitchCaseNode                        extends Node {}
class SwitchDefaultNode                     extends Node {}
class TryNode                               extends Statement {}
class TryCatchNode                          extends Node {}
class TryFinallyNode                        extends Node {}
class IfNode                                extends Statement {}
class ForNode                               extends Statement {}
class ForSignatureNode                      extends Node {}
class ExpressionStatementNode               extends Statement {}
class BlockNode                             extends Statement {}
class ModuleBlockNode                       extends BlockNode{}
// Definitions
class VariableDeclarationsNode              extends Statement {}
class VariableNode                          extends Definition {
    get nodeName(){
        return this.get(Ast.Name)
    }
    get nodeInitializer():InitializerNode{
        return this.get(Ast.Initializer);
    }
}
// Expressions
class Expression                            extends Node {}
class ArrayNode                             extends Expression {}
class ArrayElementNode                      extends Node {}
class ObjectNode                            extends Expression {}
class ObjectElementNode                     extends Node {}
class TemplateNode                          extends Expression {}

class MemberExpressionNode                  extends Expression {}
class CallExpressionNode                    extends Expression {}
class NewExpressionNode                     extends CallExpressionNode {}
class CallArgumentNode                      extends Node {}
class CallArgumentsNode                     extends Node {}

class ArrowNode                             extends Expression {}
class BinaryExpression                      extends Expression {}
class SumExpressionNode                     extends BinaryExpression {}
class SubExpressionNode                     extends BinaryExpression {}
class MulExpressionNode                     extends BinaryExpression {}
class DivExpressionNode                     extends BinaryExpression {}
class ModExpressionNode                     extends BinaryExpression {}
class AssignmentExpressionNode              extends BinaryExpression {

}
class ConditionalNode                       extends Expression {}
class ParenNode                             extends Expression {}
class PostfixNode                           extends Expression {}
class SequenceNode                          extends Expression {}
class UnaryNode                             extends Expression {}
class FunctionExpressionNode                extends Expression {
    get signature(){
        return this.get(Ast.FormalSignature)
    }
    get body(){
        return this.get(Ast.BlockStatement)
    }
    
}

// References
class Reference                             extends Expression {} // Expression
class ReferenceNode                         extends Reference {} // Expression
class IdentifierNode                        extends Reference {}
class SuperNode                             extends Reference {}
class ThisNode                              extends Reference {}
// Literals
class Literal                               extends Expression {

} // Expression
class BooleanNode                           extends Literal {}
class NanNode                               extends Literal {}
class NullNode                              extends Literal {}
class NumberNode                            extends Literal {}
class RegexpNode                            extends Literal {}
class StringNode                            extends Literal {
    get value(){
        return ValueParser.parseString(this.text);
    }
}
class NameNode                              extends Literal {
    get value(){
        return this.text;
    }
}
class UndefinedNode                         extends Literal {}


//Other 
class ModuleSpecifierNode                   extends StringNode {}


