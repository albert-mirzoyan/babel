import {Entity} from '../util/Entity'
import {Token}  from '../syntax/Token'

export class Visitor extends Entity {
    visit(node:Node){
        if(node instanceof Token){
            this.visitToken(node);
        }else
        if(typeof this[`visit${node.name}`]=='function'){
            this[`visit${node.name}`](node);
        } else {
            if(node.children && node.children.length){
                for(var child of node.children){
                    this.visit(child)
                }
            }
        }
    }
    visitToken(token:Token){

    }
}