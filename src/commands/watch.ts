import chalk from 'chalk';
import execa from 'execa';
import ora from 'ora';
import { RollupWatchOptions, WatcherOptions, watch as watcher } from 'rollup';
import yargs from 'yargs';
import { createBuildConfigs } from '../configs/createBuildConfigs';
import logError from '../logError';
import * as deprecated from '../deprecated';
import {
  cleanDistFolder,
  clearConsole,
  normalizeOpts,
  writeCjsEntryFile,
} from '../utils';

export default function watch(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.command(
    'watch',
    'Rebuilds on any change',
    (builder) => {
      return builder
        .option('entry', {
          type: 'string',
          default: '',
          alias: 'e',
          description: 'Entry module',
        })
        .option('target', {
          type: 'string',
          default: 'browser',
          description: 'Specify your target environment',
        })
        .option('name', {
          type: 'string',
          description: 'Specify name exposed in UMD builds',
        })
        .option('format', {
          type: 'string',
          default: 'cjs,esm',
          description: 'Specify module format(s)',
        })
        .option('verbose', {
          type: 'boolean',
          description:
            'Keep outdated console output in watch mode instead of clearing the screen',
        })
        .option('no-clean', {
          type: 'boolean',
          description: "Don't clean the dist folder",
        })
        .option('tsconfig', {
          type: 'string',
          description: 'Specify custom tsconfig path',
        })
        .option('on-first-success', {
          type: 'string',
          description: 'Output a user specified message on first success',
        })
        .option('on-success', {
          type: 'string',
          description: 'Output a user specified message on success',
        })
        .option('on-failure', {
          type: 'string',
          description: 'Output a user specified message on failure',
        })
        .option('transpile-only', {
          type: 'boolean',
          description: 'Skip type checking',
        })
        .option('extract-errors', {
          type: 'boolean',
          description: 'Extract invariant errors to ./errors/codes.json',
        });
    },
    async (args) => {
      const opts = await normalizeOpts({
        target: args.target as 'browser',
        entry: args.entry as string | string[],
        format: args.format as 'cjs,esm',
        extractErrors: !!args['extract-errors'] as boolean,
        noClean: !!args['no-clean'] || !!args['clean'],
        onFirstSuccess: args['on-first-success'],
        onSuccess: args['on-success'],
        onFailure: args['on-failure'],
      });
      const buildConfigs = await createBuildConfigs(opts);
      if (!opts.noClean) {
        await cleanDistFolder();
      }
      if (opts.format?.includes('cjs') && opts.name) {
        await writeCjsEntryFile(opts.name);
      }

      type Killer = execa.ExecaChildProcess | null;

      let firstTime = true;
      let successKiller: Killer = null;
      let failureKiller: Killer = null;

      function run(command?: string) {
        if (!command) {
          return null;
        }

        const [exec, ...args] = command.split(' ');
        return execa(exec, args, {
          stdio: 'inherit',
        });
      }

      function killHooks() {
        return Promise.all([
          successKiller ? successKiller.kill('SIGTERM') : null,
          failureKiller ? failureKiller.kill('SIGTERM') : null,
        ]);
      }

      const spinner = ora().start();
      watcher(
        (buildConfigs as RollupWatchOptions[]).map((inputOptions) => ({
          watch: {
            silent: true,
            include: ['src/**'],
            exclude: ['node_modules/**'],
          } as WatcherOptions,
          ...inputOptions,
        }))
      ).on('event', async (event) => {
        // clear previous onSuccess/onFailure hook processes so they don't pile up
        await killHooks();

        if (event.code === 'START') {
          if (!opts.verbose) {
            clearConsole();
          }
          spinner.start(chalk.bold.cyan('Compiling modules...'));
        }
        if (event.code === 'ERROR') {
          spinner.fail(chalk.bold.red('Failed to compile'));
          logError(event.error);
          failureKiller = run(opts.onFailure);
        }
        if (event.code === 'END') {
          spinner.succeed(chalk.bold.green('Compiled successfully'));
          console.log(`
  ${chalk.dim('Watching for changes')}
`);

          try {
            await deprecated.moveTypes();

            if (firstTime && opts.onFirstSuccess) {
              firstTime = false;
              run(args['on-first-success']);
            } else {
              successKiller = run(args['on-success']);
            }
          } catch (_error) {}
        }
      });
    }
  );
}
