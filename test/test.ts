import { expect } from 'chai';

import ia from '../src';

describe('ia lambda test', () => {
    it('should not modifiy unrelated properties', () => {
        const s1 = {
            number: 123,
            string: 'string',
            date: new Date(),
            object: {
                text: 'hello world',
            },
        };
        
        const s2 = ia(s1, s => s.number = 456);
        expect(s2).to.not.equal(s1);
        expect(s2.date).to.equal(s1.date);
        expect(s2.object).to.equal(s1.object);
        expect(s2.string).to.equal(s1.string);
        expect(s1.number).to.equal(123);
        expect(s2.number).to.equal(456);
    });
});
