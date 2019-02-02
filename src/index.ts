import parseFunctionAssignments from './parseFunctionAssignments';
import deepFreeze = require('deep-freeze-strict');

export interface DynImmutableOptions {
    useConstructor?: boolean;
    freeze?: boolean;
}

export const options: Required<DynImmutableOptions> = {
    useConstructor: true,
    freeze: typeof process !== 'undefined' && process.env.NODE_ENV !== 'production',
};

function groupBy<T, TKey extends keyof any>(array: T[], keySelector: (value: T) => TKey) {
    const result = {} as Record<TKey, T[]>;
    array.forEach((value) => {
        const key = keySelector(value);
        if (result.hasOwnProperty(key))
            result[key].push(value);
        else
            result[key] = [value];
    })
    return result;
}

function cloneIfAssigned(obj: any, assignments: string[][], useConstructor = true) {
    let newObj: any;
    if (Array.isArray(obj))
        newObj = obj.slice();
    else if (typeof obj === 'object') {
        if (obj instanceof Date) {
            newObj = new Date(obj);
        } else if (obj instanceof Map) {
            newObj = new Map(obj);
            const groupedAssignments = groupBy(assignments, x => x[0]);
            Object.keys(groupedAssignments).forEach(key => {
                const childAssignments = groupedAssignments[key];
                if (!childAssignments) return;
                const value = newObj.get(key);
                newObj.set(key, cloneIfAssigned(value, childAssignments.map(a => a.slice(1))));
            });
        } else {
            newObj = useConstructor ? new obj.constructor() : {};
            for (const key in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
                const value = obj[key];
                const childAssignments = assignments.filter(a => a[0] === key);
                newObj[key] = childAssignments.length ? cloneIfAssigned(value, childAssignments.map(a => a.slice(1))) : value;
            }
        }
    } else {
        newObj = obj;
    }
    return newObj;
}

export function setOptions(newOptions: DynImmutableOptions) {
    Object.assign(options, newOptions);
}

export default function immutableAssign<TObj>(obj: TObj, fn: (o: TObj) => void): TObj;
export default function immutableAssign<TObj, TArgs extends Record<string, any>>(obj: TObj, fn: (o: TObj, args: TArgs) => void, args: TArgs): TObj;
export default function immutableAssign<TObj, TArgs extends Record<string, any>>(obj: TObj, fn: (o: TObj, args: TArgs) => void, args?: TArgs) {
    let assignments = parseFunctionAssignments(fn.toString());
    if (args) {
        assignments = assignments
            .map(assignment => assignment
                .map(part => part[0] !== '%' ? part : args[part.substr(1)])
            );
    }
    if (assignments.length === 0)
        throw new Error('State updater did not contain any assignments');
    const newObj = cloneIfAssigned(obj, assignments);
    fn(newObj, args!);
    if (options.freeze)
        deepFreeze(newObj);
    return newObj;
}
