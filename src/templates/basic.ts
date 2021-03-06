import { Template } from './template';

const basicTemplate: Template = {
  name: 'basic',
  dependencies: [
    'husky',
    '@prismify/tsdx',
    'tslib',
    'typescript',
    'size-limit',
    '@size-limit/preset-small-lib',
    'ts-jest',
    '@types/jest',
    'jest',
  ],
  packageJson: {
    // name: safeName,
    version: '0.1.0',
    license: 'MIT',
    // author: author,
    main: 'dist/index',
    // module: `dist/${safeName}.esm.js`,
    typings: `dist/index.d.ts`,
    files: ['dist', 'src'],
    engines: {
      node: '>=10',
    },
    scripts: {
      start: 'tsdx watch',
      build: 'tsdx build',
      test: 'tsdx test',
      lint: 'tsdx lint',
      prepare: 'tsdx build',
      size: 'size-limit',
      analyze: 'size-limit --why',
    },
    peerDependencies: {},
    /*
    'size-limit': [
      {
        path: `dist/${safeName}.cjs.production.min.js`,
        limit: '10 KB',
      },
      {
        path: `dist/${safeName}.esm.js`,
        limit: '10 KB',
      },
    ],
    */
  },
};

export default basicTemplate;
