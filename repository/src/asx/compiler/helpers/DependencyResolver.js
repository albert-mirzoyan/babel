import {Visitor} from '../syntax/Visitor'

export class DependencyResolver extends Visitor {
    static resolve(source){
        var resolver = new DependencyResolver();
        resolver.visit(source.ast);
        return resolver.dependencies;
    }
    get dependencies(){
        if(!this.$.dependencies){
            this.$.dependencies={}
        }
        return this.$.dependencies;
    }
    visitModuleSpecifier(node:ModuleSpecifier){
        this.dependencies[node.value]=true;
    }
}