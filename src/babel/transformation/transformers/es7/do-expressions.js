import * as t from "../../../types";

export var metadata = {
  optional: true,
  stage: 0
};

export var shouldVisit = t.isDoExpression;

export function DoExpression(node) {
  var body = node.body.body;
  if (body.length) {
    return body;
  } else {
    return t.identifier("undefined");
  }
}
