import * as t from "../../../types";

export var shouldVisit = t.isArrowFunctionExpression;

export function ArrowFunctionExpression(node) {
  t.ensureBlock(node);

  node.expression = false;
  node.type = "FunctionExpression";
  node.shadow = true;
}
