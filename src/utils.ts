import * as fs from 'fs-extra';
import path from 'path';
import camelCase from 'camelcase';
import shell from 'shelljs';

import { ModuleFormat, NormalizedOpts, PackageJson, WatchOpts } from './types';
import { concatAllArray } from 'jpjs';
import glob from 'tiny-glob/sync';
import ora from 'ora';
import { Input } from 'enquirer';
import chalk from 'chalk';
import App from './utils/app';
import AppPath from './utils/app-path';

// Remove the package name scope if it exists
export const removeScope = (name: string) => name.replace(/^@.*\//, '');

// UMD-safe package name
export const safeVariableName = (name: string) =>
  camelCase(
    removeScope(name)
      .toLowerCase()
      .replace(/((^[^a-zA-Z]+)|[^\w.-])|([^a-zA-Z0-9]+$)/g, '')
  );

export const safePackageName = (name: string) => {
  if (name === '.') return path.basename(path.resolve('.'));
  const normalize = (string: string) =>
    string
      .toLowerCase()
      .replace(/(^@.*\/)|((^[^a-zA-Z]+)|[^\w.-])|([^a-zA-Z0-9]+$)/g, '');
  return normalize(name);
};

export const external = (id: string) =>
  !id.startsWith('.') && !path.isAbsolute(id);

// Taken from Create React App, react-dev-utils/clearConsole
// @see https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/clearConsole.js
export function clearConsole() {
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
}

export function getReactVersion({
  dependencies,
  devDependencies,
}: PackageJson) {
  return (
    (dependencies && dependencies.react) ||
    (devDependencies && devDependencies.react)
  );
}

export function getNodeEngineRequirement({ engines }: PackageJson) {
  return engines && engines.node;
}

export const isDir = async (name: string) =>
  fs
    .stat(name)
    .then((stats) => stats.isDirectory())
    .catch(() => false);

export const isFile = async (name: string) =>
  fs
    .stat(name)
    .then((stats) => stats.isFile())
    .catch(() => false);

export async function resolveFile(filename: string) {
  const extension = (await isFile(AppPath.resolve(filename + '.ts')))
    ? '.ts'
    : (await isFile(AppPath.resolve(filename + '.tsx')))
    ? '.tsx'
    : (await isFile(AppPath.resolve(filename + '.jsx')))
    ? '.jsx'
    : '.js';

  return AppPath.resolve(`${filename}${extension}`);
}

export function setAuthorName(author: string) {
  shell.exec(`npm config set init-author-name "${author}"`, { silent: true });
}

export function getAuthorName() {
  let author = '';

  author = shell
    .exec('npm config get init-author-name', { silent: true })
    .stdout.trim();
  if (author) return author;

  author = shell
    .exec('git config --global user.name', { silent: true })
    .stdout.trim();
  if (author) {
    setAuthorName(author);
    return author;
  }

  author = shell
    .exec('npm config get init-author-email', { silent: true })
    .stdout.trim();
  if (author) return author;

  author = shell
    .exec('git config --global user.email', { silent: true })
    .stdout.trim();
  if (author) return author;

  return author;
}

export function writeCjsEntryFile(name: string) {
  const baseLine = `module.exports = require('./${safePackageName(name)}`;
  const contents = `
'use strict'

if (process.env.NODE_ENV === 'production') {
  ${baseLine}.cjs.production.min.js')
} else {
  ${baseLine}.cjs.development.js')
}
`;
  return fs.outputFile(path.join(AppPath.dist_directory, 'index.js'), contents);
}

export async function cleanDistFolder() {
  await fs.remove(AppPath.dist_directory);
}

async function getInputs(
  entries: string | string[] = [],
  source?: string
): Promise<string[]> {
  // if (Array.isArray(entries)) {
  //   return [...new Set(entries.map(async (file) => await ).flat())];
  // }

  // let result = ([] as string[]).concat(
  //   entries && entries.length
  //     ? entries
  //     : (source && resolveApp(source)) ||
  //         ((await isDir(resolveApp('src'))) && (await jsOrTs('src/index')))
  // );
  // return [...entries];
  return concatAllArray(
    ([] as any[])
      .concat(
        entries && entries.length
          ? entries
          : (source && AppPath.resolve(source)) ||
              ((await isDir(AppPath.resolve('src'))) &&
                (await resolveFile('src/index')))
      )
      .map((file) => glob(file))
  );
}

export async function normalizeOpts(opts: WatchOpts): Promise<NormalizedOpts> {
  return {
    ...opts,
    name: opts.name || App.package.name,
    input: await getInputs(opts.entry, App.package.source),
    format: opts.format.split(',').map((format: string) => {
      if (format === 'es') {
        return 'esm';
      }
      return format;
    }) as [ModuleFormat, ...ModuleFormat[]],
  };
}

export async function getProjectPath(
  name: string,
  path: string,
  spinner: ora.Ora
): Promise<string> {
  if (name === '.') return process.cwd();
  const exists = await fs.pathExists(path);
  if (!exists) {
    return path;
  }

  spinner.fail(`Failed to create ${chalk.bold.red(name)}`);
  const prompt = new Input({
    message: `A folder named ${chalk.bold.red(
      name
    )} already exists! ${chalk.bold('Choose a different name')}`,
    initial: name + '-1',
    result: (v: string) => v.trim(),
  });

  name = await prompt.run();
  path = (await fs.realpath(process.cwd())) + '/' + name;
  spinner.start(`Creating ${chalk.bold.green(name)}...`);
  return await getProjectPath(name, path, spinner); // recursion!
}
