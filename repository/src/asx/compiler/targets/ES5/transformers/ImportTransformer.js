import {Visitor} from '../../../syntax/Visitor'
export class ImportTransformer extends Visitor {
    visitImportDeclaration(node:ImportDeclarationNode){
        this.output.ast.add(node)
    }
}