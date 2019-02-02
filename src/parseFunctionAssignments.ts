import { parse, ESTree } from 'cherow';
import * as acornWalk from 'acorn-walk';
import {
    ArrowFunctionExpression,
    CallExpression,
    ExpressionStatement,
    FunctionExpression,
    Identifier,
    Literal,
    MemberExpression,
    Node,
} from 'cherow/dist/types/estree';

function isCallExpression(node: Node): node is CallExpression { return node.type === 'CallExpression'; }
function isFunctionExpression(node: Node): node is FunctionExpression { return node.type === 'FunctionExpression'; }
function isArrowFunctionExpression(node: Node): node is ArrowFunctionExpression { return node.type === 'ArrowFunctionExpression'; }
function isIdentifier(node: Node): node is Identifier { return node.type === 'Identifier'; }
function isLiteral(node: Node): node is Literal { return node.type === 'Literal'; }
function isMemberExpression(node: Node): node is MemberExpression { return node.type === 'MemberExpression'; }

function getNodeSource(node: Node) {
    return node.loc!.source!.substring(node.start!, node.end);
}

function getFirstIdentifier(node: Node) {
    while (node) {
        if (isMemberExpression(node))
            node = node.object;
        else if (isCallExpression(node))
            node = node.callee;
        else
            break;
    }
    if (isIdentifier(node))
        return node;
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
function parseExpression(inNode: Node, parts: string[], argsName?: string) {
    acornWalk.recursive(inNode, null, {
        MemberExpression: (node: MemberExpression, _state, c) => {
            c(node.object, _state);
            if (node.computed) {
                if (
                    isMemberExpression(node.property) &&
                    isIdentifier(node.property.object) &&
                    node.property.object.name === argsName &&
                    isIdentifier(node.property.property)
                ) {
                    parts.push('%' + node.property.property.name);
                } else if (
                    isIdentifier(node.property) &&
                    node.property.name === argsName
                ) {
                    parts.push('%');
                } else {
                    throw new Error('Illegal statement assignment expression: ' + getNodeSource(node.property));
                }
            } else if (isIdentifier(node.property)) {
                parts.push(node.property.name);
            }
        },
        CallExpression: (callNode: CallExpression, _state, c) => {
            if (!isMemberExpression(callNode.callee))
                throw new Error('Invalid function call: ' + getNodeSource(callNode.callee));
            if (!isIdentifier(callNode.callee.property))
                throw new Error('Invalid function call: ' + getNodeSource(callNode.callee));

            // Check if this is a call to .get(...)
            if (callNode.callee.property.name !== 'get' || callNode.arguments.length !== 1)
                throw new Error('Only Map get/set calls supported: ' + getNodeSource(callNode.callee));

            // Walk over callee-base
            c(callNode.callee.object, _state);

            // Append map getter key
            const keyArg = callNode.arguments[0];
            if (isLiteral(keyArg)) {
                parts.push(String(keyArg.value));
            } else if (isMemberExpression(keyArg)) {
                if (
                    !isIdentifier(keyArg.object) ||
                    keyArg.object.name !== argsName ||
                    !isIdentifier(keyArg.property)
                ) {
                    throw new Error('Illegal statement assignment expression: ' + getNodeSource(keyArg));
                }
                parts.push('%' + keyArg.property.name);
            } else {
                throw new Error('Unsupported key argument ' + getNodeSource(callNode.arguments[0]));
            }
        },
    });
}

export default function parseFunctionAssignments(fnStr: string) {
    if (cachedFunctionAssignments.has(fnStr))
        return cachedFunctionAssignments.get(fnStr)!.slice();

    const parsedFnStr = `(${fnStr})`;
    const ast = parse(parsedFnStr, { ranges: true, loc: true, source: parsedFnStr });

    const fnAst = (ast.body[0] as ExpressionStatement).expression;
    if (!fnAst || (!isFunctionExpression(fnAst) && !isArrowFunctionExpression(fnAst)))
        throw new Error('passed string is not a function expresion');

    if (fnAst.params.length < 1)
        throw new Error('state argument is required');
    if (fnAst.params.length > 2)
        throw new Error('too many arguments');
    const [stateParam, argsParam] = fnAst.params;

    if (!isIdentifier(stateParam))
        throw new Error('Unexpected error: ' + getNodeSource(stateParam));
    const stateName = stateParam.name;

    if (argsParam && !isIdentifier(argsParam))
        throw new Error('Unexpected error: ' + getNodeSource(argsParam));
    const argsName = argsParam ? argsParam.name : undefined;

    const assignments: string[][] = [];
    acornWalk.ancestor(fnAst, {
        AssignmentExpression: (assNode: ESTree.AssignmentExpression) => {
            if (assNode.operator !== '=')
                throw new Error('Unsupported assignment operation: ' + assNode.operator);

            // Validate if this is amd-dep state assignment
            let firstIdentifier = getFirstIdentifier(assNode.left);
            if (!firstIdentifier || firstIdentifier.name !== stateName)
                return;

            // Walk expression tree and build path while replacing arguments
            const parts: string[] = [];
            parseExpression(assNode.left, parts, argsName);
            assignments.push(parts);
        },
        CallExpression: (callNode: CallExpression, ancestors) => {
            for (let i = ancestors.length - 1; i >= 0; i--) {
                const t = ancestors[i].type;
                if (t === 'AssignmentExpression')
                    return;
                if (t === 'BlockStatement' || t === 'ReturnStatement')
                    break;
            }

            if (!isMemberExpression(callNode.callee) || !isIdentifier(callNode.callee.property))
                return;

            // Validate if this is amd-dep state assignment
            let firstIdentifier = getFirstIdentifier(callNode.callee);
            if (!firstIdentifier || firstIdentifier.name !== stateName)
                return;

            const argCount = callNode.arguments.length;
            const fnName = callNode.callee.property.name;
            if (!(fnName === 'set' && argCount === 2) && !(fnName === 'delete' && argCount === 1))
                throw new Error('Only calls to Map.set and Map.delete are supported: ' + getNodeSource(callNode.callee));

            // Walk expression tree and build path while replacing arguments
            const parts: string[] = [];
            parseExpression(callNode.callee.object, parts, argsName);

            assignments.push(parts);
        },
    });
    cachedFunctionAssignments.set(fnStr, assignments);
    return assignments;
}
