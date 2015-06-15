import {Url} from 'asx/runtime';
import Utils from 'asx/runtime/utils';
import Ajax from 'asx/ajax';

export class View {
    static PAGES = {};
    static VIEWS = {};
    static SETTINGS = {
        evaluate        : /<%([\s\S]+?)%>/g,
        interpolate     : /<%=([\s\S]+?)%>/g,
        escape          : /<%-([\s\S]+?)%>/g,
        escapeRegExp    : /\\|'|\r|\n|\u2028|\u2029/g,
        escapes         : {
            "'": "'",
            '\\': '\\',
            '\r': 'r',
            '\n': 'n',
            '\u2028': 'u2028',
            '\u2029': 'u2029'
        },
        escapeChar      : function(match) {
            return '\\' + View.SETTINGS.escapes[match];
        }
    };
    static compile(text,name,settings) {
       settings = settings || View.SETTINGS;
        // Combine delimiters into one regular expression via alternation.
        var matcher = RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(settings.escapeRegExp, settings.escapeChar);
            index = offset + match.length;

            if (escape) {
                source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            } else if (interpolate) {
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
                source += "';\n" + evaluate + "\n__p+='";
            }

            // Adobe VMs need the match returned to produce the correct offest.
            return match;
        });
        source += "';\n";

        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(data||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + 'return __p;\n//# sourceURL='+name;
        var render;
        try {
            render = new Function(settings.variable || 'data', '_', source);
        } catch (e) {
            e.source = source;
            throw e;
        }

        var template = function(data) {
            return render.call(this, data);
        };

        // Provide the compiled source as a convenience for precompilation.
        var argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';

        return template;
    };
    static init(app){
        window.addEventListener('load',()=>{
            console.info(Object.keys(View.VIEWS));
            console.info(Object.keys(View.PAGES));
            console.info(document.body);
            console.info(app);
            console.info();
            View.page = new View.DEFAULT_PAGE();
            View.page.update(app);

        });
    }
    static
    constructor(child){
        if(child!=this){
            var ChildView = child.constructor;
            ChildView.NAME = Utils.hypenize(ChildView.name);
            if(!ChildView.ELEMENT){
                ChildView.ELEMENT = 'div';
            }
            if(child.isPage){
                View.PAGES[ChildView.NAME] = ChildView;
                if(ChildView.DEFAULT){
                    View.DEFAULT_PAGE = ChildView;
                }
            }
            View.VIEWS[ChildView.NAME] = ChildView;
            var base = new Url(child.module.url).resolve('../');
            if(ChildView.EJS){
                var template = base.resolve(ChildView.EJS);
                template = Ajax.readSync(template.toString());
                ChildView.prototype.template = View.compile(template,ChildView.EJS);
            }
            if(ChildView.CSS){
                var css = Ajax.readSync(base.resolve(ChildView.CSS).toString());
                var style = document.createElement('style');
                style.setAttribute('id',ChildView.NAME);
                style.appendChild(document.createTextNode(css));
                document.head.appendChild(style)
            }
        }
    }
    constructor(container){
        console.info(this['constructor'].NAME);
        var type    = this['constructor'].NAME;
        var uuid    = Utils.uuid(type);
        var node    = container || document.createElement(this['constructor'].ELEMENT);
        node.setAttribute('id',uuid);
        node.setAttribute('class',type);
        Asx._(this,{
            uuid:uuid,
            type:type,
            node:node
        });
    }
    get node(){
        return this._.node;
    }
    get uuid(){
        return this._.uuid;
    }
    get type(){
        return this._.type;
    }

    append(el){
        el.appendChild(this.node);
    }
    render(data){
        this.node.innerHTML = this.template(data);
        console.info(this.node);
    }
    add(view){
        this.node.appendChild(view.node);
    }
    clear(){
        this.node.innerHTML=''
    }
}
export class Page extends View {
    static
    constructor(child){
        super(child);
        if(child!=this) {
            child.isPage = true;
        }
    }
    constructor(){
        super(document.body);
    }
    update(model){
        this.model = model;
        this.render(this.model);
    }
}