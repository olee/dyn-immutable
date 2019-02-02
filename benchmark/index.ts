import { Suite } from 'benchmark';

import ia from '../src';

import iassign, { setOption } from 'immutable-assign';
setOption({ useConstructor: true });

const suite = new Suite();

function createNestedState(level: number) {
    const result: any = {};
    let current = result;
    for (let i = 0; i < level; i++) {
        current = current.nested = {};
    }
    current.value = 'hello world!';
    return result;
}

function createFlatState(count: number) {
    const result: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
        result['v' + i] = i;
    }
    return result;
}

const simpleState = { value: 1 };

const nestedState10 = createNestedState(10);
const nestedState20 = createNestedState(20);
const nestedState40 = createNestedState(40);
const nestedState80 = createNestedState(80);

const flatState10 = createFlatState(10);
// const flatState40 = createFlatState(40);

// add tests
suite
    .add('javascript      : nested x10', () => {
        const newState = { ...nestedState80,
            nested: { ...nestedState80.nested,
                nested: { ...nestedState80.nested.nested,
                    nested: { ...nestedState80.nested.nested.nested,
                        nested: { ...nestedState80.nested.nested.nested.nested,
                            nested: { ...nestedState80.nested.nested.nested.nested.nested,
                                nested: { ...nestedState80.nested.nested.nested.nested.nested.nested,
                                    nested: { ...nestedState80.nested.nested.nested.nested.nested.nested.nested,
                                        nested: { ...nestedState80.nested.nested.nested.nested.nested.nested.nested.nested,
                                            nested: { ...nestedState80.nested.nested.nested.nested.nested.nested.nested.nested.nested,
                                                nested: { ...nestedState80.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested,
                                                    value: 'changed'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    })
    .add('dyn-immutable   : simple    ', () => {
        ia(simpleState, s => s.value = 2);
    })
    .add('dyn-immutable   : nested x10', () => {
        ia(nestedState10, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .value = 'changed'
        );
    })
    .add('dyn-immutable   : nested x20', () => {
        ia(nestedState20, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .value = 'changed'
        );
    })
    .add('dyn-immutable   : nested x40', () => {
        ia(nestedState40, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .value = 'changed'
        );
    })
    .add('dyn-immutable   : nested x80', () => {
        ia(nestedState80, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .value = 'changed'
        );
    })
    .add('dyn-immutable   : flat x10  ', () => {
        ia(flatState10, s => {
            s.v0 = -1;
            s.v1 = -1;
            s.v2 = -2;
            s.v3 = -3;
            s.v4 = -4;
            s.v5 = -5;
            s.v6 = -6;
            s.v7 = -7;
            s.v8 = -8;
            s.v9 = -9;
        });
    })
    .add('immutable-assign: simple    ', () => {
        iassign(simpleState, s => s, s => { s.value = 2; return s; });
    })
    .add('immutable-assign: nested x10', () => {
        iassign(nestedState10, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested,
            s => { s.value = 'changed'; return s; }
        );
    })
    .add('immutable-assign: nested x20', () => {
        iassign(nestedState20, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested,
            s => { s.value = 'changed'; return s; }
        );
    })
    .add('immutable-assign: nested x40', () => {
        iassign(nestedState40, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested,
            s => { s.value = 'changed'; return s; }
        );
    })
    .add('immutable-assign: nested x80', () => {
        iassign(nestedState80, s => s
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested
            .nested.nested.nested.nested.nested.nested.nested.nested.nested.nested,
            s => { s.value = 'changed'; return s; }
        );
    })
    .add('immutable-assign: flat x10  ', () => {
        iassign(flatState10, s => s, s => {
            s.v0 = -1;
            s.v1 = -1;
            s.v2 = -2;
            s.v3 = -3;
            s.v4 = -4;
            s.v5 = -5;
            s.v6 = -6;
            s.v7 = -7;
            s.v8 = -8;
            s.v9 = -9;
            return s; 
        });
    })
    // add listeners
    .on('cycle', (event: any) => {
        console.log(String(event.target));
    })
    .on('complete', function(this: Suite) {
        console.log('Fastest is ' + this.filter('fastest').map('name' as any));
    })
    // run async
    .run({ 'async': true })
    ;
