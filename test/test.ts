import { expect } from 'chai';

import ia from '../src';

class TestClass {
    public id?: string;
    public text: string = 'Hello world!';
}

function createTestState() {
    return {
        num: 1234,
        date: new Date(2019, 2, 2),
        string: 'Hello world!',
        plainObj: {
            text: 'Hello world',
        },
        classObj: new TestClass(),
        record: {
            foo: { text: 'I am foo' },
            bar: { text: 'I am bar' },
        } as Record<string, { text: string } | undefined>,
        map: new Map([
            ['foo', { text: 'I am foo' }],
            ['bar', { text: 'I am bar' }],
        ]),
    };
}

const defaultState: Readonly<ReturnType<typeof createTestState>> = createTestState();

describe('immutableAssign', () => {
    it('should not modifiy unrelated properties', () => {
        const s1 = createTestState();
        const s2 = ia(s1, s => s.num = 42);
        expect(s2).to.not.equal(s1);
        expect(s1.num).to.equal(defaultState.num);
        expect(s2.num).to.equal(42);
        expect(s2.date).to.equal(s1.date);
        expect(s2.string).to.equal(s1.string);
        expect(s2.plainObj).to.equal(s1.plainObj);
        expect(s2.classObj).to.equal(s1.classObj);
        expect(s2.record).to.equal(s1.record);
        expect(s2.map).to.equal(s1.map);
    });

    it('should handle multiple assignments in a single call', () => {
        const s1 = createTestState();
        const s2 = ia(s1, s => {
            s.num = 0;
            s.num = 42;
            s.string = 'Hello dyn-immutable!';
        });
        expect(s1.num).to.equal(defaultState.num);
        expect(s1.string).to.equal(defaultState.string);
        expect(s2.num).to.equal(42);
        expect(s2.string).to.equal('Hello dyn-immutable!');
    });
});

describe('immutableAssign - useConstructor', () => {
    it('should keep object types with useConstructor=true', () => {
        const s1 = createTestState();
        const s2 = ia(s1, s => s.classObj.text = 'I am a class!', undefined, { useConstructor: true });
        expect(s1.classObj.text).to.equal(defaultState.classObj.text);
        expect(s2.classObj.text).to.equal('I am a class!');
        expect(s2.classObj.constructor).to.equal(TestClass);
    });

    it('should not keep object types with useConstructor=false', () => {
        const s1 = createTestState();
        const s2 = ia(s1, s => s.classObj.text = 'I am a class!', undefined, { useConstructor: false });
        expect(s1.classObj.text).to.equal(defaultState.classObj.text);
        expect(s2.classObj.text).to.equal('I am a class!');
        expect(s2.classObj.constructor).to.equal(Object);
    });
});

describe('immutableAssign - arguments', () => {
    it('should allow using object arguments', () => {
        const s1 = createTestState();
        const s2 = ia(s1, (s, args) => s.num = args.value, { value: 42 });
        expect(s1.num).to.equal(defaultState.num);
        expect(s2.num).to.equal(42);
    });

    it('should allow using value arguments', () => {
        const s1 = createTestState();
        const s2 = ia(s1, (s, arg) => s.num = arg, 42);
        expect(s1.num).to.equal(defaultState.num);
        expect(s2.num).to.equal(42);
    });

    it('should allow using scoped variables on right-hand side of assignments', () => {
        const s1 = createTestState();
        const newValue = 42;
        const s2 = ia(s1, s => s.num = newValue);
        expect(s1.num).to.equal(defaultState.num);
        expect(s2.num).to.equal(newValue);
    });

    it('should allow using arguments on right-hand side of assignments', () => {
        const s1 = createTestState();
        const s2 = ia(s1, (s, args) => s.num = args.value, { value: 42 });
        expect(s1.num).to.equal(defaultState.num);
        expect(s2.num).to.equal(42);
    });

    it('should allow using arguments on left-hand side of assignments', () => {
        const s1 = createTestState();
        const original = s1.record;
        const s2 = ia(s1, (s, key) => s.record[key]!.text = 'I am not foobar!', 'bar');
        expect(s1.record).to.equal(original);
        expect(s2.record).to.not.equal(s1.record);
        expect(s2.record.foo).to.equal(s1.record.foo);
        expect(s2.record.bar).to.not.equal(s1.record.bar);
        expect(s2.record.bar!.text).to.equal('I am not foobar!');
    });

    it('should not allow using scoped variables on left-hand side of assignments', () => {
        const s1 = createTestState();
        expect(() => {
            const key = 'foo';
            ia(s1, s => s.record[key]!.text = 'error!');
        }).to.throw();
    });
});

describe('immutableAssign - Map', () => {
    it('should handle setting Map entries', () => {
        const s1 = createTestState();
        const s1Map = s1.map;
        const s2 = ia(s1, s => s.map.set('foobar', { text: 'I am foobar!' }));
        expect(s1.map).to.equal(s1Map);
        expect(s2.map).to.not.equal(s1.map);
        expect(s2.map.size).to.equal(s1.map.size + 1);
        expect(s2.map.get('foo')).to.equal(s1.map.get('foo'));
        expect(s2.map.get('bar')).to.equal(s1.map.get('bar'));
        expect(s2.map.get('foobar')).to.not.be.undefined;
        expect(s2.map.get('foobar')!.text).to.equal('I am foobar!');
    });

    it('should handle modifying Map entries', () => {
        const s1 = createTestState();
        const s1Map = s1.map;
        const s2 = ia(s1, s => s.map.get('bar')!.text = 'I am not foobar!');
        expect(s1.map).to.equal(s1Map);
        expect(s2.map).to.not.equal(s1.map);
        expect(s2.map.get('foo')).to.equal(s1.map.get('foo'));
        expect(s2.map.get('bar')).to.not.equal(s1.map.get('bar'));
        expect(s2.map.get('bar')!.text).to.equal('I am not foobar!');
    });

    it('should handle deleting Map entries', () => {
        const s1 = createTestState();
        const s1Map = s1.map;
        const s2 = ia(s1, s => s.map.delete('bar'));
        expect(s1.map).to.equal(s1Map);
        expect(s2.map).to.not.equal(s1.map);
        expect(s2.map.get('foo')).to.equal(s1.map.get('foo'));
        expect(s2.map.get('bar')).to.be.undefined;
    });
});
