import { RollupOptions, OutputOptions, rollup } from 'rollup';
import yargs from 'yargs';
import { createBuildConfigs } from '../configs/createBuildConfigs';
import { createProgressEstimator } from '../configs/createProgressEstimator';
import logError from '../logError';
import { cleanDistFolder, normalizeOpts, writeCjsEntryFile } from '../utils';
import asyncro from 'asyncro';
import * as deprecated from '../deprecated';

export default function build(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.command(
    'build',
    'Build your project once and exit',
    (builder) => {
      return builder
        .option('entry', {
          type: 'string',
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
          default: '',
          description: 'Specify name exposed in UMD builds',
        })
        .option('format', {
          type: 'string',
          default: 'cjs,esm',
          description: 'Specify module format(s)',
        })
        .option('tsconfig', {
          type: 'string',
          description: 'Specify custom tsconfig path',
        })
        .option('transpile-only', {
          type: 'boolean',
          description: 'Skip type checking',
        })
        .option('extract-errors', {
          type: 'boolean',
          default: false,
          description: 'Extract invariant errors to ./errors/codes.json',
        });
    },
    async (args) => {
      const opts = await normalizeOpts({
        target: args.target as 'browser',
        entry: args.entry as string | string[],
        format: args.format as 'cjs,esm',
        extractErrors: !!args['extract-errors'] as boolean,
        noClean: !!args['no-clean'],
        tsconfig: args.tsconfig,
      });
      const buildConfigs = await createBuildConfigs({
        ...opts,
        // @ts-ignore
        transpileOnly: !!args['transpile-only'],
      });
      await cleanDistFolder();
      const logger = await createProgressEstimator();
      if (opts.format.includes('cjs')) {
        const promise = writeCjsEntryFile(opts.name).catch(logError);
        logger(promise, 'Creating entry file');
      }
      try {
        const promise = asyncro
          .map(
            buildConfigs,
            async (inputOptions: RollupOptions & { output: OutputOptions }) => {
              let bundle = await rollup(inputOptions);
              await bundle.write(inputOptions.output);
            }
          )
          .catch((e: any) => {
            throw e;
          })
          .then(async () => {
            await deprecated.moveTypes();
          });
        logger(promise, 'Building modules');
        await promise;
      } catch (error) {
        logError(error);
        process.exit(1);
      }
    }
  );
}
