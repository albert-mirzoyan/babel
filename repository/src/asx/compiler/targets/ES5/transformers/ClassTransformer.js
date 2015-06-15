import {Visitor} from '../../../syntax/Visitor'
import {Ast} from '../../../syntax/Ast'
export class ClassTransformer extends Visitor {
    visitClass(node:ClassDeclarationNode){
        node.parent.remove(node);
        node.parent.add(new Ast.CallExpression());
    }
}