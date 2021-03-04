import { RollupOptions, OutputOptions } from 'rollup';
import { existsSync } from 'fs-extra';
import { TsdxOptions, NormalizedOpts } from '../types';
import { createRollupConfig } from './createRollupConfig';
import AppPath from '../utils/app-path';
import { flatten } from 'lodash';
// check for custom tsdx.config.js
let tsdxConfig = {
  rollup(config: RollupOptions, _options: TsdxOptions): RollupOptions {
    return config;
  },
};

if (existsSync(AppPath.appconfig)) {
  tsdxConfig = require(AppPath.appconfig);
}

export async function createBuildConfigs(
  opts: NormalizedOpts
): Promise<Array<RollupOptions & { output?: OutputOptions }>> {
  const inputs = flatten(
    opts.input.map((input: string) =>
      createAllFormats(opts, input).map(
        (options: TsdxOptions, index: number) => ({
          ...options,
          // We want to know if this is the first run for each entryfile
          // for certain plugins (e.g. css)
          writeMeta: index === 0,
        })
      )
    )
  );

  return await Promise.all(
    inputs.map(async (options: TsdxOptions, index: number) => {
      // pass the full rollup config to tsdx.config.js override
      const config = await createRollupConfig(options, index);
      return tsdxConfig.rollup(config, options);
    })
  );
}

function createAllFormats(
  opts: NormalizedOpts,
  input: string
): [TsdxOptions, ...TsdxOptions[]] {
  return [
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'development',
      input,
    },
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'production',
      input,
    },
    opts.format.includes('esm') && { ...opts, format: 'esm', input },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'development',
      input,
    },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'production',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'development',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'production',
      input,
    },
  ].filter(Boolean) as [TsdxOptions, ...TsdxOptions[]];
}
