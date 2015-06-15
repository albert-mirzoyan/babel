import {Parser} from './syntax/Parser';
import {Source} from './syntax/Source';


export function main(){
    var src = Parser.parse(new Source({
        name    : 'source.js',
        content : 'class Gago {}'
    }))
    console.info(src.ast)
}