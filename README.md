# dyn-immutable
A Node.js library to immutably modify plain old JavaScript objects (POJO)

## Installation
```sh
npm install dyn-immutable
```

## How it works
This library exports a single function to immutably assign values to any variables inside a deeply nested object structure (like a redux store).

This works by parsing the string conversion of the passed update function with an AST parser and extracting all assignments to the state variable argument.
This information is then used to create a clone of the passed state but only where properties are know to change when executing the state update function.

## Usage

```js
import ia from 'dyn-immutable';
import TestClass from './TestClass';

let state = lastState = {
    num: 123,
    string: 'hello world!',
    plainObj: {
        text: 'hello world',
    },
    classObj: new TestClass(),
    record: {
        foo: { text: 'I am foo'},
        bar: { text: 'I am bar'},
    },
    map: new Map(),
};

state = ia(state, s => s.num = 456);
// state.num            !== lastState.num
// other fields are referentially equal

// Set multiple state variables in the same call!
lastState = state;
state = ia(state, s => {
    s.num = 42;
    s.plainObj.text = 'helly dyn-immutable!';
    s.classObj.value = "I'm a class!";
});
// state.plainObj       !== lastState.plainObj
// state.classObj       !== lastState.classObj
// other fields are referentially equal
// if useConstructor option is enabled, classObj is a new instance of type TestClass and not a POJO!

// Use arguments to access dynamic keys
lastState = state;
state = ia(state, (s, args) => s.record[args.key].text = args.value, { 
    key: 'bar',
    value: 'foobar' 
});
// state.record.foo     === lastState.record.foo
// state.record.bar     !== lastState.record.bar

// You CANNOT use scope variables on left-hand side of assignments state update functions!
try {
    let key = 'bar';
    state = ia(state, (s, args) => s.record[key].text = 'foobar');
} catch (err) {
    // Will throw an error because local variable key used in expression
}

// This WILL work, because left-hand side of assignment can be properly parsed as path
// ['record', '%key', 'text']
let value = 'foobar';
state = ia(state, (s, args) => s.record[args.key].text = value, { key: 'bar' });
```

## API

### default (immutableAssign function)
```ts
function immutableAssign<TObj>(obj: TObj, setter: (o: TObj) => void): TObj;
function immutableAssign<TObj>(obj: TObj, setter: (o: TObj) => void, args: undefined, options?: DynImmutableOptions): TObj;
function immutableAssign<TObj, TArgs>(obj: TObj, setter: (o: TObj, args: TArgs) => void, args: TArgs, options?: DynImmutableOptions): TObj;
```

### setOptions(newOptions: DynImmutableOptions)
Sets options for this library. The newOptions object is merged with the current options.

### DynImmutableOptions
```ts
interface DynImmutableOptions {
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
```
