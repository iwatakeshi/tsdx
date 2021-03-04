import path from 'path';
import yargs from 'yargs';
import {
  JestConfigOptions,
  createJestConfig,
} from '../configs/createJestConfig';
import { promises as fs } from 'fs';
import { run } from 'jest';
import AppPath from '../utils/app-path';
import App from '../utils/app';
import * as JSONC from 'comment-json';

export default function test(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.command(
    'test',
    'Run jest test runner. Passes all flags directly to Jest',
    (builder) =>
      builder.help(false).option('--help', {
        type: 'boolean',
      }),
    async (args) => {
      // Do this as the first thing so that any code reading it knows the right env.
      process.env.BABEL_ENV = 'test';
      process.env.NODE_ENV = 'test';
      // Makes the script crash on unhandled rejections instead of silently
      // ignoring them. In the future, promise rejections that are not handled will
      // terminate the Node.js process with a non-zero exit code.
      process.on('unhandledRejection', (err) => {
        throw err;
      });

      if ('help' in args || '--help' in args) {
        await run(['--help']);
        return;
      }

      const [, ...rest] = args._ as string[];
      let jestConfig: JestConfigOptions = {
        ...createJestConfig(
          (relativePath) => path.resolve(__dirname, '..', relativePath),
          AppPath.root_directory
        ),
        ...App.package.jest,
      };

      // Allow overriding with jest.config
      const defaultPathExists = await fs
        .access(AppPath.jestconfig)
        .then(() => true)
        .catch(() => false);
      if (defaultPathExists) {
        const jestConfigPath = AppPath.jestconfig;
        const jestConfigContents: JestConfigOptions = require(jestConfigPath);
        jestConfig = { ...jestConfig, ...jestConfigContents };
      }

      await run([
        ...rest,
        '--config',
        JSONC.stringify({
          ...jestConfig,
        }),
      ]);
    }
  );
}
