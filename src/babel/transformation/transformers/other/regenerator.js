import regenerator from "regenerator";
import * as t from "../../../types";

export function shouldVisit(node) {
  return t.isFunction(node) && (node.async || node.generator);
}

export var Program = {
  enter(ast) {
    regenerator.transform(ast);
    this.stop();
    return ast; // force a checkPath, this really needs to be optimised
  }
};
