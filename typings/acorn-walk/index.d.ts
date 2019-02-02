declare module 'acorn-walk' {
    import { Node } from 'acorn';

    export type VisitorFunction<S = any> = (node: any, state: S) => void;
    
    export function simple<S = any>(ast: Node, visitors: Record<string, VisitorFunction<S>>, baseVisitor?: any, state?: S): void;

    export function ancestor(ast: Node, visitors: Record<string, VisitorFunction<Node[]>>, baseVisitor?: any): void;

    export type RecursiveWalkFunction<S = any> = (node: any, state: S, c: (node: Node, state: any, override?: string) => void) => void;

    export function recursive<S = any>(ast: Node, state: S, functions: Record<string, RecursiveWalkFunction<S>>): void;
}
