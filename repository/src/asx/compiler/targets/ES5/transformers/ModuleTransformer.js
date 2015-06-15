import {Visitor} from '../../../syntax/Visitor'
import {Ast} from '../../../syntax/Ast'
import {Node} from '../../../syntax/Node'
import {JST} from '../../../syntax/JST'

export class ModuleTransformer extends Visitor {
    visitModule(node:ModuleNode){
        //console.info(JST.statement `var a=${node};`);
    }
}