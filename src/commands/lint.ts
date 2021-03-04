import chalk from 'chalk';
import { ESLint } from 'eslint';
import yargs from 'yargs';
import { createEslintConfig } from '../configs/createEslintConfig';
import * as fs from 'fs-extra';
import App from '../utils/app';
import AppPath from '../utils/app-path';
export default function lint(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.command(
    'lint',
    'Run eslint with Prettier',
    (builder) => {
      return builder
        .option('fix', {
          type: 'boolean',
          description: 'Fixes fixable errors and warnings',
        })
        .option('ignore-path', {
          type: 'string',
          description: 'Specify path of ignore file',
        })
        .option('no-ignore', {
          type: 'boolean',
          description: 'Disable use of ignore files and patterns',
        })
        .option('ignore-pattern', {
          type: 'string',
          description:
            'Pattern of files to ignore (in addition to those in .eslintignore)',
        })
        .option('max-warnings', {
          type: 'number',
          description: 'Number of warnings to trigger nonzero exit code',
          default: Infinity,
        })
        .option('write-file', {
          type: 'boolean',
          description: 'Write the config file locally',
        })
        .option('report-file', {
          type: 'string',
          description: 'Write JSON report to file locally',
        });
    },
    async (args) => {
      let [, ...files] = args._ as string[];
      if (
        files.length === 0 &&
        (!args['write-file'] || !('write-file' in args))
      ) {
        const defaultInputs = ['src', 'test'].filter(fs.existsSync);
        files = defaultInputs;
        console.log(
          chalk.yellow(
            `Defaulting to "tsdx lint ${defaultInputs.join(' ')}"`,
            '\nYou can override this in the package.json scripts, like "lint": "tsdx lint src otherDir"'
          )
        );
      }

      const config = await createEslintConfig({
        pkg: App.package,
        rootDir: AppPath.root_directory,
        writeFile: 'write-file' in args,
      });
      const eslint = new ESLint({
        baseConfig: {
          ...config,
          ...App.package.eslint,
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        fix: args.fix,
        ignore: 'ignore' in args ? false : true,
        ignorePath: args['ignore-path'],
        overrideConfig: {
          ignorePatterns: args['ignore-pattern'],
        },
      });
      const results = await eslint.lintFiles(files);
      if (args.fix) {
        ESLint.outputFixes(results);
      }
      console.log((await eslint.loadFormatter()).format(results));
      if (args['report-file']) {
        await fs.outputFile(
          args['report-file'],
          await (await eslint.loadFormatter('json')).format(results)
        );
      }
      if (results.reduce((a, b) => a + b.errorCount, 0)) {
        process.exit(1);
      }
      if (
        results.reduce((a, b) => a + b.warningCount, 0) > args['max-warnings']
      ) {
        process.exit(1);
      }
    }
  );
}
