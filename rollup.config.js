import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

const targets = process.env.ES === 'true' ? {node: true} : {browsers: ['>1%', 'last 2 versions']};

export default {
  entry: 'src/index.js',
  plugins: [
    babel({
      presets: [['env', {
        targets: targets,
        modules: false,
      }], 'react'],
      plugins: ['transform-class-properties'],
      exclude: 'node_modules/**',
      babelrc: false,
    }),
    nodeResolve({
      jsnext: true,
      main: true,
    }),
    commonjs({
      include: 'node_modules/**',
    }),
  ],
};
