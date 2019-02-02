import alias from 'rollup-plugin-alias';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import path from 'path';

export default {
    input: 'dist/index.js',
    output: {
        file: 'dist/index.min.js',
        format: 'cjs',
        exports: 'named',
    },
    plugins: [
        alias({
            'cherow': path.resolve(__dirname, 'node_modules/cherow/dist/umd/cherow.min.js'),
        }),
        nodeResolve(),
        commonjs(),
        terser(),
    ],
};
