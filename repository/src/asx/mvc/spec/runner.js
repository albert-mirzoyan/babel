import mocha from 'asx/mocha';
import test_binding     from './tests/binding';
import test_binders     from './tests/binders';
import test_functional  from './tests/functional';
import test_routines    from './tests/routines';
import test_templates   from './tests/templates';


export function main(){
    window.addEventListener('load',e=>{
        mocha.setup('bdd');
        test_binding();
        test_binders();
        test_functional();
        test_routines();
        test_templates();
        mocha.run();
    });
}