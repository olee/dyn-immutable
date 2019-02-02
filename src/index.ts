import parseFunctionAssignments from './parseFunctionAssignments';
import deepFreeze = require('deep-freeze-strict');

export interface DynImmutableOptions {
    /**
     * If enabled, will use the constructor of the present object to create the clone.
     * Otherwise only clones as plain objects.
     * Default: true
     */
    useConstructor?: boolean;
    /**
     * If enabled, deep-freezes new state after modification
     * Default: true if NODE_ENV != 'production'
     */
    freeze?: boolean;
}

export const defaultOptions: Required<DynImmutableOptions> = {
    useConstructor: true,
    freeze: typeof process !== 'undefined' && process.env.NODE_ENV !== 'production',
};

function groupAssignments(array: string[][]) {
    const result = {} as Record<string, string[][]>;
    array.forEach((value) => {
        if (value.length) {
            if (result.hasOwnProperty(value[0]))
                result[value[0]].push(value.slice(1));
            else
                result[value[0]] = [value.slice(1)];
        }
    })
    return result;
}

function cloneIfAssigned(obj: any, assignments: string[][], useConstructor?: boolean) {
    let newObj: any;
    if (Array.isArray(obj))
        newObj = obj.slice();
    else if (typeof obj === 'object') {
        if (obj instanceof Date) {
            newObj = new Date(obj);
        } else if (obj instanceof Map) {
            newObj = new Map(obj);
            const groupedChildAssignments = groupAssignments(assignments);
            Object.keys(groupedChildAssignments).forEach(key => {
                newObj.set(key, cloneIfAssigned(newObj.get(key), groupedChildAssignments[key], useConstructor));
            });
        } else {
            newObj = useConstructor ? new obj.constructor() : {};
            const groupedChildAssignments = groupAssignments(assignments);
            for (const key in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
                // If any property was changed in the child object, clone it as well, otherwise copy by reference
                newObj[key] = groupedChildAssignments[key] && groupedChildAssignments[key].length ?
                    cloneIfAssigned(obj[key], groupedChildAssignments[key], useConstructor) :
                    obj[key];
            }
        }
    } else {
        newObj = obj;
    }
    return newObj;
}

export function setOptions(newOptions: DynImmutableOptions) {
    Object.assign(defaultOptions, newOptions);
}

function checkOption(options: DynImmutableOptions | undefined, option: keyof DynImmutableOptions) {
    return options && options[option] !== undefined ? options[option] : defaultOptions[option];
}

export default function immutableAssign<TObj>(obj: TObj, setter: (o: TObj) => void): TObj;
export default function immutableAssign<TObj>(obj: TObj, setter: (o: TObj) => void, args: undefined, options?: DynImmutableOptions): TObj;
export default function immutableAssign<TObj, TArgs>(obj: TObj, setter: (o: TObj, args: TArgs) => void, args: TArgs, options?: DynImmutableOptions): TObj;
export default function immutableAssign<TObj, TArgs>(obj: TObj, setter: (o: TObj, args: TArgs) => void, args?: TArgs, options?: DynImmutableOptions): TObj {
    let assignments = parseFunctionAssignments(setter.toString());
    if (assignments.length === 0)
        throw new Error('State updater did not contain any assignments');

    // Insert / validate arguments for setter
    assignments = assignments.map(assignment => assignment.map(part => {
        if (part[0] !== '%') return part;
        if (part.length === 1) {
            if (typeof args !== 'string')
                throw new Error('Setter using args as key requires args to be string');
            return args;
        } else {
            if (typeof args !== 'object')
                throw new Error('Setter using named arguments requires args to be object');
            return (args as any)[part.substr(1)];
        }
    }));

    // Deep clone object where setter will perform assignments
    const newObj = cloneIfAssigned(obj, assignments, checkOption(options, 'useConstructor'));

    // Run setter
    setter(newObj, args!);

    // Optionally deep freeze object
    // TODO: This could also only freeze where assignments happened?
    if (checkOption(options, 'freeze'))
        deepFreeze(newObj);

    return newObj;
}
