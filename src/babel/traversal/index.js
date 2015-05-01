import TraversalContext from "./context";
import explode from "./explode";
import * as messages from "../messages";
import includes from "lodash/collection/includes";
import * as t from "../types";

export default function traverse(parent, opts, scope, state, parentPath) {
  if (!parent) return;

  if (!opts.noScope && !scope) {
    if (parent.type !== "Program" && parent.type !== "File") {
      throw new Error(messages.get("traverseNeedsParent", parent.type));
    }
  }

  if (!opts) opts = {};
  traverse.verify(opts);

  // array of nodes
  if (Array.isArray(parent)) {
    for (var i = 0; i < parent.length; i++) {
      traverse.node(parent[i], opts, scope, state, parentPath);
    }
  } else {
    traverse.node(parent, opts, scope, state, parentPath);
  }
}

/**
 * Quickly iterate over some traversal options and validate them.
 */

traverse.verify = function (opts) {
  if (opts._verified) return;

  if (typeof opts === "function") {
    throw new Error(messages.get("traverseVerifyRootFunction"));
  }

  if (!opts.enter) opts.enter = function () { };
  if (!opts.exit) opts.exit = function () { };
  if (!opts.shouldSkip) opts.shouldSkip = function () { return false; };

  for (var key in opts) {
    // it's all good
    if (key === "blacklist") continue;

    var opt = opts[key];

    if (typeof opt === "function") {
      // it's all good, it's fine for this key to be a function
      if (key === "enter" || key === "exit" || key === "shouldSkip") continue;

      throw new Error(messages.get("traverseVerifyVisitorFunction", key));
    } else if (typeof opt === "object") {
      for (var key2 in opt) {
        if (key2 === "enter" || key2 === "exit") continue;
        throw new Error(messages.get("traverseVerifyVisitorProperty", key, key2));
      }
    }
  }

  opts._verified = true;
};

traverse.node = function (node, opts, scope, state, parentPath) {
  var keys = t.VISITOR_KEYS[node.type];
  if (!keys) return;

  var context = new TraversalContext(scope, opts, state, parentPath);
  for (var i = 0; i < keys.length; i++) {
    if (context.visit(node, keys[i])) {
      return;
    }
  }
};

const CLEAR_KEYS = [
  "trailingComments", "leadingComments", "extendedRange",
  "_scopeInfo" ,"_paths",
  "tokens", "range", "start", "end", "loc", "raw"
];

function clearNode(node) {
  for (var i = 0; i < CLEAR_KEYS.length; i++) {
    var key = CLEAR_KEYS[i];
    if (node[key] != null) node[key] = null;
  }

  for (var key in node) {
    var val = node[key];
    if (Array.isArray(val)) {
      delete val._paths;
    }
  }
}

var clearVisitor = {
  noScope: true,
  exit: clearNode
};

function clearComments(comments) {
  for (var i = 0; i < comments.length; i++) {
    clearNode(comments[i]);
  }
}

traverse.removeProperties = function (tree) {
  traverse(tree, clearVisitor);
  clearNode(tree);

  return tree;
};

traverse.explode = explode;

function hasBlacklistedType(node, parent, scope, state) {
  if (node.type === state.type) {
    state.has = true;
    this.skip();
  }
}

traverse.hasType = function (tree, scope, type, blacklistTypes) {
  // the node we're searching in is blacklisted
  if (includes(blacklistTypes, tree.type)) return false;

  // the type we're looking for is the same as the passed node
  if (tree.type === type) return true;

  var state = {
    has:  false,
    type: type
  };

  traverse(tree, {
    blacklist: blacklistTypes,
    enter: hasBlacklistedType
  }, scope, state);

  return state.has;
};
