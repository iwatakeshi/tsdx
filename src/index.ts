#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
import yargs from 'yargs';
// @ts-ignore
import { hideBin } from 'yargs/helpers';
// @ts-ignore
import { build, create, lint, test, watch } from './commands/index';
// @ts-ignore
import { flow } from 'lodash/fp';
const parser = () => yargs(hideBin(process.argv));
const bin = (yargs: yargs.Argv) => yargs.scriptName('tsdx');
const version = (yargs: yargs.Argv) => yargs.version();
const help = (yargs: yargs.Argv) => yargs.help();
//@ts-ignore
const argv = flow([bin, version, build, test, lint, create, watch, help])(
  parser()
).argv;
