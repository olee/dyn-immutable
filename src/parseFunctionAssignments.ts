import * as acorn from 'acorn';
import { Node } from 'acorn';
import * as acornWalk from 'acorn-walk';

interface NodeAssignmentExpression<TLeft extends Node = Node> extends Node {
    left: TLeft;
    operator: '=' | '+=' | '-=' | '/=' | '*=';
}

interface NodeCallExpression extends Node {
    arguments: Node[];
    callee: NodeMemberExpression;
}

interface NodeMemberExpression<TObj = Node, TProp = Node> extends Node {
    object: TObj;
    property: TProp;
    computed: boolean;
}

interface NodeIdentifier extends Node {
    name: string;
}

interface NodeFunctionExpression extends Node {
    body: Node[];
    params: NodeIdentifier[];
}

interface NodeLiteral extends Node {
    raw: string;
    value: string;
}

function isNodeIdentifier(node: Node): node is NodeIdentifier {
    return node.type === 'Identifier';
}

function isNodeMemberExpression(node: Node): node is NodeMemberExpression {
    return node.type === 'MemberExpression';
}

function isNodeCallExpression(node: Node): node is NodeCallExpression {
    return node.type === 'CallExpression';
}

function isNodeLiteral(node: Node): node is NodeLiteral {
    return node.type === 'Literal';
}

const cachedFunctionAssignments = new Map<string, string[][]>();

/**
 * Walks over the member expression AST and generates the "path" to the targeted variable
 * @param  inNode      [description]
 * @param  parts       [description]
 * @param  parsedFnStr [description]
 * @param  argsName    [description]
 * @return             [description]
 */
function parseExpression(inNode: Node, parts: string[], parsedFnStr: string, argsName?: string) {
    acornWalk.recursive(inNode, null, {
        MemberExpression: (node: NodeMemberExpression, _state, c) => {
            c(node.object, _state);
            if (node.computed) {
                if (
                    !isNodeMemberExpression(node.property) ||
                    !isNodeIdentifier(node.property.object) ||
                    node.property.object.name !== argsName ||
                    !isNodeIdentifier(node.property.property)
                ) {
                    throw new Error('Illegal statement assignment expression at ' + parsedFnStr.substring(node.property.start, node.property.end));
                }
                parts.push('%' + node.property.property.name);
            } else if (isNodeIdentifier(node.property)) {
                parts.push(node.property.name);
            }
        },
        CallExpression: (callNode: NodeCallExpression, _state, c) => {
            if (!isNodeIdentifier(callNode.callee.property))
                throw new Error('Invalid function call at ' + parsedFnStr.substring(callNode.callee.start, callNode.callee.end));

            // Check if this is a call to .get(...)
            if (callNode.callee.property.name !== 'get' || callNode.arguments.length !== 1)
                throw new Error('Only Map get/set calls supported at ' + parsedFnStr.substring(callNode.callee.start, callNode.callee.end));

            // Walk over callee-base
            c(callNode.callee.object, _state);

            // Append map getter key
            const keyArg = callNode.arguments[0];
            if (isNodeLiteral(keyArg)) {
                parts.push(keyArg.value);
            } else if (isNodeMemberExpression(keyArg)) {
                if (
                    !isNodeIdentifier(keyArg.object) ||
                    keyArg.object.name !== argsName ||
                    !isNodeIdentifier(keyArg.property)
                ) {
                    throw new Error('Illegal statement assignment expression at ' + parsedFnStr.substring(keyArg.start, keyArg.end));
                }
                parts.push('%' + keyArg.property.name);
            } else {
                throw new Error('Unsupported key argument ' + parsedFnStr.substring(callNode.arguments[0].start, callNode.arguments[0].end));
            }
        },
    });
}

export default function parseFunctionAssignments(fnStr: string) {
    if (cachedFunctionAssignments.has(fnStr))
        return cachedFunctionAssignments.get(fnStr)!.slice();
    const parsedFnStr = 'const $$$expr = ' + fnStr;
    const assignments: string[][] = [];
    const ast = acorn.parse(parsedFnStr) as any;
    const fnAst = ast.body[0].declarations[0].init as NodeFunctionExpression;
    if (fnAst.params.length > 2)
        throw new Error('too many arguments');
    if (fnAst.params.length < 1)
        throw new Error('state argument is required');
    const stateName = fnAst.params[0].name;
    const argsName = fnAst.params[1] ? fnAst.params[1].name : undefined;

    acornWalk.ancestor(fnAst, {
        AssignmentExpression: (assNode: NodeAssignmentExpression) => {
            if (assNode.operator !== '=')
                throw new Error('Unsupported assignment operation ' + assNode.operator);

            // Validate if this is amd-dep state assignment
            let firstIdentifier = assNode.left;
            while (firstIdentifier) {
                if (isNodeMemberExpression(firstIdentifier))
                    firstIdentifier = firstIdentifier.object;
                else if (isNodeCallExpression(firstIdentifier))
                    firstIdentifier = firstIdentifier.callee.object;
                else
                    break;
            }
            if (!isNodeIdentifier(firstIdentifier) || firstIdentifier.name !== stateName)
                return;

            // Walk expression tree and build path while replacing arguments
            const parts: string[] = [];
            parseExpression(assNode.left, parts, parsedFnStr, argsName);
            assignments.push(parts);
        },
        CallExpression: (callNode: NodeCallExpression, ancestors) => {
            for (let i = ancestors.length - 1; i >= 0; i--) {
                const t = ancestors[i].type;
                if (t === 'AssignmentExpression')
                    return;
                if (t === 'BlockStatement' || t === 'ReturnStatement')
                    break;
            }

            // Validate if this is amd-dep state assignment
            let firstIdentifier = callNode.callee.object;
            while (firstIdentifier && isNodeMemberExpression(firstIdentifier)) firstIdentifier = firstIdentifier.object;
            if (!isNodeIdentifier(firstIdentifier) || firstIdentifier.name !== stateName)
                return;
            if (!isNodeIdentifier(callNode.callee.property))
                return;

            // Check if this is a call to .set(...)
            if (callNode.callee.property.name !== 'set' || callNode.arguments.length !== 2)
                throw new Error('Only Map get/set calls supported at ' + parsedFnStr.substring(callNode.callee.start, callNode.callee.end));

            // Walk expression tree and build path while replacing arguments
            const parts: string[] = [];
            parseExpression(callNode.callee.object, parts, parsedFnStr, argsName);

            // Append map setter key
            const keyArg = callNode.arguments[0];
            if (isNodeLiteral(keyArg)) {
                parts.push(keyArg.value);
            } else if (isNodeMemberExpression(keyArg)) {
                if (
                    !isNodeIdentifier(keyArg.object) ||
                    keyArg.object.name !== argsName ||
                    !isNodeIdentifier(keyArg.property)
                ) {
                    throw new Error('Illegal statement assignment expression at ' + parsedFnStr.substring(keyArg.start, keyArg.end));
                }
                parts.push('%' + keyArg.property.name);
            } else {
                throw new Error('Unsupported key argument ' + parsedFnStr.substring(callNode.arguments[0].start, callNode.arguments[0].end));
            }

            assignments.push(parts);
        },
    });
    cachedFunctionAssignments.set(fnStr, assignments);
    return assignments;
}
