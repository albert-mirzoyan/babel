import {ClassTransformer} from './transformers/ClassTransformer'
import {ModuleTransformer} from './transformers/ModuleTransformer'

export class Transformer {
    static transform(source){
        //new ModuleTransformer().visit(source.ast);
        //new ClassTransformer().visit(source.ast);
        //console.info(source.ast);
    }
}