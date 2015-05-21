import convertSourceMap from "convert-source-map";
import * as optionParsers from "./option-parsers";
import moduleFormatters from "../modules";
import PluginManager from "./plugin-manager";
import shebangRegex from "shebang-regex";
import TraversalPath from "../../traversal/path";
import isFunction from "lodash/lang/isFunction";
import isAbsolute from "path-is-absolute";
import resolveRc from "../../tools/resolve-rc";
import sourceMap from "source-map";
import transform from "./../index";
import generate from "../../generation";
import stringify from "../../helpers/stringify-ast";
import codeFrame from "../../helpers/code-frame";
import defaults from "lodash/object/defaults";
import includes from "lodash/collection/includes";
import traverse from "../../traversal";
import assign from "lodash/object/assign";
import Logger from "./logger";
import parse from "../../helpers/parse";
import Scope from "../../traversal/scope";
import slash from "slash";
import clone from "lodash/lang/clone";
import * as util from  "../../util";
import * as api from  "../../api/node";
import path from "path";
import each from "lodash/collection/each";
import * as t from "../../types";

var checkTransformerVisitor = {
  exit(node, parent, scope, state) {
    checkPath(state.stack, this);
  }
};

function checkPath(stack, path) {
  each(stack, function (pass) {
    if (pass.shouldRun || pass.ran) return;
    pass.checkPath(path);
  });
}

export default class File {
  constructor(opts = {}, pipeline=null) {
    this.dynamicImportTypes = {};
    this.dynamicImportIds   = {};
    this.dynamicImports     = [];

    this.declarations = {};
    this.usedHelpers  = {};
    this.dynamicData  = {};
    this.data         = {};
    this.uids         = {};

    this.pipeline = pipeline;
    this.log      = new Logger(this, opts.filename || "unknown");
    this.opts     = this.normalizeOptions(opts);
    this.ast      = {};

    this.buildTransformers();
  }

  static helpers = [
    "inherits",
    "defaults",
    "create-class",
    "create-decorated-class",
    "create-decorated-object",
    "define-decorated-property-descriptor",
    "tagged-template-literal",
    "tagged-template-literal-loose",
    "to-array",
    "to-consumable-array",
    "sliced-to-array",
    "sliced-to-array-loose",
    "object-without-properties",
    "has-own",
    "slice",
    "bind",
    "define-property",
    "async-to-generator",
    "interop-require-wildcard",
    "interop-require-default",
    "typeof",
    "extends",
    "get",
    "set",
    "class-call-check",
    "object-destructuring-empty",
    "temporal-undefined",
    "temporal-assert-defined",
    "self-global",
    "default-props",
    "instanceof",
    "E56",

    // legacy
    "interop-require",
  ];

  static soloHelpers = [
    "ludicrous-proxy-create",
    "ludicrous-proxy-directory"
  ];

  static options = require("./options");

  normalizeOptions(opts: Object) {
    opts = assign({}, opts);

    if (opts.filename) {
      var rcFilename = opts.filename;
      if (!isAbsolute(rcFilename)) rcFilename = path.join(process.cwd(), rcFilename);
      opts = resolveRc(rcFilename, opts);
    }

    //

    for (let key in opts) {
      if (key[0] === "_") continue;

      let option = File.options[key];
      if (!option) this.log.error(`Unknown option: ${key}`, ReferenceError);
    }

    for (let key in File.options) {
      let option = File.options[key];

      var val = opts[key];
      if (!val && option.optional) continue;

      if (val && option.deprecated) {
        throw new Error("Deprecated option " + key + ": " + option.deprecated);
      }

      if (val == null) {
        val = clone(option.default);
      }

      var optionParser = optionParsers[option.type];
      if (optionParser) val = optionParser(key, val, this.pipeline);

      if (option.alias) {
        opts[option.alias] = opts[option.alias] || val;
      } else {
        opts[key] = val;
      }
    }

    if (opts.inputSourceMap) {
      opts.sourceMaps = true;
    }

    // normalize windows path separators to unix
    opts.filename = slash(opts.filename);
    if (opts.sourceRoot) {
      opts.sourceRoot = slash(opts.sourceRoot);
    }

    if (opts.moduleId) {
      opts.moduleIds = true;
    }

    opts.basename = path.basename(opts.filename, path.extname(opts.filename));

    opts.ignore = util.arrayify(opts.ignore, util.regexify);
    opts.only   = util.arrayify(opts.only, util.regexify);

    defaults(opts, {
      moduleRoot: opts.sourceRoot
    });

    defaults(opts, {
      sourceRoot: opts.moduleRoot
    });

    defaults(opts, {
      filenameRelative: opts.filename
    });

    defaults(opts, {
      sourceFileName: opts.filenameRelative,
      sourceMapName:  opts.filenameRelative
    });

    //

    if (opts.externalHelpers) {
      this.set("helpersNamespace", t.identifier("babelHelpers"));
    }

    return opts;
  };

  isLoose(key: string) {
    return includes(this.opts.loose, key);
  }

  buildTransformers() {
    var file = this;

    var transformers = this.transformers = {};

    var secondaryStack = [];
    var stack = [];

    // build internal transformers
    each(this.pipeline.transformers, function (transformer, key) {
      var pass = transformers[key] = transformer.buildPass(file);

      if (pass.canTransform()) {
        stack.push(pass);

        if (transformer.metadata.secondPass) {
          secondaryStack.push(pass);
        }

        if (transformer.manipulateOptions) {
          transformer.manipulateOptions(file.opts, file);
        }
      }
    });

    // init plugins!
    var beforePlugins = [];
    var afterPlugins = [];
    var pluginManager = new PluginManager({
      file: this,
      transformers: this.transformers,
      before: beforePlugins,
      after: afterPlugins
    });
    for (var i = 0; i < file.opts.plugins.length; i++) {
      pluginManager.add(file.opts.plugins[i]);
    }
    stack = beforePlugins.concat(stack, afterPlugins);

    // register
    this.transformerStack = stack.concat(secondaryStack);
  }

  set(key: string, val): any {
    return this.data[key] = val;
  };

  setDynamic(key: string, fn: Function) {
    this.dynamicData[key] = fn;
  }

  get(key: string): any {
    var data = this.data[key];
    if (data) {
      return data;
    } else {
      var dynamic = this.dynamicData[key];
      if (dynamic) {
        return this.set(key, dynamic());
      }
    }
  }

  resolveModuleSource(source: string): string {
    var resolveModuleSource = this.opts.resolveModuleSource;
    if (resolveModuleSource) source = resolveModuleSource(source, this.opts.filename);
    return source;
  }

  addImport(source: string, name: string, type: string): Object {
    name = name || source;
    var id = this.dynamicImportIds[name];

    if (!id) {
      source = this.resolveModuleSource(source);
      id = this.dynamicImportIds[name] = this.scope.generateUidIdentifier(name);

      var specifiers = [t.importDefaultSpecifier(id)];
      var declar = t.importDeclaration(specifiers, t.literal(source));
      declar._blockHoist = 3;

      if (type) {
        var modules = this.dynamicImportTypes[type] = this.dynamicImportTypes[type] || [];
        modules.push(declar);
      }

      if (this.transformers["es6.modules"].canTransform()) {
        this.moduleFormatter.importSpecifier(specifiers[0], declar, this.dynamicImports);
        this.moduleFormatter.hasLocalImports = true;
      } else {
        this.dynamicImports.push(declar);
      }
    }

    return id;
  }

  attachAuxiliaryComment(node: Object): Object {
    var comment = this.opts.auxiliaryComment;
    if (comment) {
      node.leadingComments = node.leadingComments || [];
      node.leadingComments.push({
        type: "Line",
        value: " " + comment
      });
    }
    return node;
  }

  addHelper(name: string): Object {
    var isSolo = includes(File.soloHelpers, name);

    if (!isSolo && !includes(File.helpers, name)) {
      throw new ReferenceError(`Unknown helper ${name}`);
    }

    var program = this.ast.program;

    var declar = this.declarations[name];
    if (declar) return declar;

    this.usedHelpers[name] = true;

    if (!isSolo) {
      var generator = this.get("helperGenerator");
      var runtime   = this.get("helpersNamespace");
      if (generator) {
        return generator(name);
      } else if (runtime) {
        var id = t.identifier(t.toIdentifier(name));
        return t.memberExpression(runtime, id);
      }
    }

    var ref = util.template("helper-" + name);

    var uid = this.declarations[name] = this.scope.generateUidIdentifier(name);

    if (t.isFunctionExpression(ref) && !ref.id) {
      ref.body._compact = true;
      ref._generated = true;
      ref.id = uid;
      ref.type = "FunctionDeclaration";
      this.path.unshiftContainer("body", ref);
    } else {
      ref._compact = true;
      this.scope.push({
        id: uid,
        init: ref,
        unique: true
      });
    }

    return uid;
  }

  errorWithNode(node, msg, Error = SyntaxError) {
    var loc = node.loc.start;
    var err = new Error(`Line ${loc.line}: ${msg}`);
    err.loc = loc;
    return err;
  }

  checkPath(path) {
    if (Array.isArray(path)) {
      for (var i = 0; i < path.length; i++) {
        this.checkPath(path[i]);
      }
      return;
    }

    var stack = this.transformerStack;

    checkPath(stack, path);

    path.traverse(checkTransformerVisitor, {
      stack: stack
    });
  }

  mergeSourceMap(map: Object) {
    var opts = this.opts;

    var inputMap = opts.inputSourceMap;

    if (inputMap) {
      map.sources[0] = inputMap.file;

      var inputMapConsumer   = new sourceMap.SourceMapConsumer(inputMap);
      var outputMapConsumer  = new sourceMap.SourceMapConsumer(map);
      var outputMapGenerator = sourceMap.SourceMapGenerator.fromSourceMap(outputMapConsumer);
      outputMapGenerator.applySourceMap(inputMapConsumer);

      var mergedMap = outputMapGenerator.toJSON();
      mergedMap.sources = inputMap.sources
      mergedMap.file    = inputMap.file;
      return mergedMap;
    }

    return map;
  }


  getModuleFormatter(type: string) {
    var ModuleFormatter = isFunction(type) ? type : moduleFormatters[type];

    if (!ModuleFormatter) {
      var loc = util.resolveRelative(type);
      if (loc) ModuleFormatter = require(loc);
    }

    if (!ModuleFormatter) {
      throw new ReferenceError(`Unknown module formatter type ${JSON.stringify(type)}`);
    }

    return new ModuleFormatter(this);
  }

  parse(code: string) {
    var opts = this.opts;

    //

    var parseOpts = {
      highlightCode: opts.highlightCode,
      nonStandard:   opts.nonStandard,
      filename:      opts.filename,
      plugins:       {}
    };

    var features = parseOpts.features = {};
    for (var key in this.transformers) {
      var transformer = this.transformers[key];
      features[key] = transformer.canTransform();
    }

    parseOpts.looseModules = this.isLoose("es6.modules");
    parseOpts.strictMode = features.strict;
    parseOpts.sourceType = "module";

    this.log.debug("Parse start");

    var tree = parse(code, parseOpts);
    this.log.debug("Parse stop");
    return tree;
  }

  _addAst(ast) {
    this.path  = TraversalPath.get(null, null, ast, ast, "program", this);
    this.scope = this.path.scope;
    this.ast   = ast;
    this.sast  = JSON.parse(JSON.ast(ast));
    this.path.traverse({
      enter(node, parent, scope) {
        if (this.isScope()) {
          for (var key in scope.bindings) {
            scope.bindings[key].setTypeAnnotation();
          }
        }
      }
    });
  }

  addAst(ast) {
    this.log.debug("Start set AST");
    this._addAst(ast);
    this.log.debug("End set AST");

    this.log.debug("Start prepass");
    this.checkPath(this.path);
    this.log.debug("End prepass");

    this.log.debug("Start module formatter init");
    var modFormatter = this.moduleFormatter = this.getModuleFormatter(this.opts.modules);
    if (modFormatter.init && this.transformers["es6.modules"].canTransform()) {
      modFormatter.init();
    }
    this.log.debug("End module formatter init");

    this.call("pre");
    each(this.transformerStack, function (pass) {
      pass.transform();
    });
    this.call("post");
  }

  wrap(code, callback) {
    code = code + "";

    try {
      if (this.shouldIgnore()) {
        return {
          metadata: {},
          code:     code,
          map:      null,
          ast:      null
        };
      }

      callback();

      return this.generate();
    } catch (err) {
      if (err._babel) {
        throw err;
      } else {
        err._babel = true;
      }

      var message = err.message = `${this.opts.filename}: ${err.message}`;

      var loc = err.loc;
      if (loc) {
        err.codeFrame = codeFrame(code, loc.line, loc.column + 1, this.opts);
        message += "\n" + err.codeFrame;
      }

      if (err.stack) {
        var newStack = err.stack.replace(err.message, message);
        try {
          err.stack = newStack;
        } catch (e) {
          // `err.stack` may be a readonly property in some environments
        }
      }

      throw err;
    }
  }

  addCode(code: string, parseCode) {
    code = (code || "") + "";
    code = this.parseInputSourceMap(code);
    this.code = code;

    if (parseCode) {
      this.parseShebang();
      this.addAst(this.parse(this.code));
    }
  }

  shouldIgnore() {
    var opts = this.opts;
    return util.shouldIgnore(opts.filename, opts.ignore, opts.only);
  }

  call(key: string) {
    var stack = this.transformerStack;
    for (var i = 0; i < stack.length; i++) {
      var transformer = stack[i].transformer;
      var fn = transformer[key];
      if (fn) fn(this);
    }
  }

  parseInputSourceMap(code: string) {
    var opts = this.opts;

    if (opts.inputSourceMap !== false) {
      var inputMap = convertSourceMap.fromSource(code);
      if (inputMap) {
        opts.inputSourceMap = inputMap.toObject();
        code = convertSourceMap.removeComments(code);
      }
    }

    return code;
  }

  parseShebang() {
    var shebangMatch = shebangRegex.exec(this.code);
    if (shebangMatch) {
      this.shebang = shebangMatch[0];
      this.code = this.code.replace(shebangRegex, "");
    }
  }

  generate(){
    var opts = this.opts;
    var ast  = this.ast;
    var sast  = this.sast;

    var result = {
      metadata: {},
      code:     "",
      map:      null,
      ast:      null,
      original: this.original
    };

    if (this.opts.metadataUsedHelpers) {
      result.metadata.usedHelpers = Object.keys(this.usedHelpers);
    }

    if (opts.ast) {
      result.ast = ast;
      result.sast = sast;
    }
    if (!opts.code) return result;

    this.log.debug("Generation start");

    var _result = generate(ast, opts, this.code);
    result.code = _result.code;
    result.map  = _result.map;

    this.log.debug("Generation end");

    if (this.shebang) {
      // add back shebang
      result.code = `${this.shebang}\n${result.code}`;
    }

    if (result.map) {
      result.map = this.mergeSourceMap(result.map);
    }

    if (opts.sourceMaps === "inline" || opts.sourceMaps === "both") {
      result.code += "\n" + convertSourceMap.fromObject(result.map).toComment();
    }

    if (opts.sourceMaps === "inline") {
      result.map = null;
    }

    return result;
  }
}
