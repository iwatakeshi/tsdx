import yargs from 'yargs';
import { templates } from '../templates';
import chalk from 'chalk';
import { LOGO } from '../constants';
import ora from 'ora';
import * as fs from 'fs-extra';
import { Input, Select } from 'enquirer';
import path from 'path';
import execa from 'execa';
import {
  getAuthorName,
  getNodeEngineRequirement,
  getProjectPath,
  safePackageName,
  setAuthorName,
} from '../utils';
import { composePackageJson } from '../templates/utils';
import semver from 'semver';
import * as messages from '../messages';
import logError from '../logError';
import getInstallCmd from '../getInstallCmd';
import getInstallArgs from '../getInstallArgs';

export default function create(yargs: yargs.Argv<{}>): yargs.Argv<{}> {
  return yargs.command(
    'create <library>',
    'Create a new package with TSDX',
    (builder) => {
      return builder
        .positional('library', {
          type: 'string',
        })
        .option('template', {
          default: 'basic',
          type: 'string',
          choices: Object.keys(templates),
          description: 'Specify a template.',
        })
        .example('create mylib', 'Create a library')
        .example('create --template react mylib', 'Create a react library');
    },
    async (args) => {
      console.log(chalk.blue(LOGO));
      let name = args.library as string;
      const spinner = ora(`Creating ${chalk.bold.green(name)}...`);
      let template = '';
      const safeName = safePackageName(name);
      try {
        // get the project path
        const realPath = await fs.realpath(process.cwd());
        let projectPath = await getProjectPath(
          name,
          realPath + '/' + name,
          spinner
        );

        const prompt = new Select({
          message: 'Choose a template',
          choices: Object.keys(templates),
        });

        if (args.template) {
          template = args.template.trim();
          if (!prompt.choices.includes(template)) {
            spinner.fail(`Invalid template ${chalk.bold.red(template)}`);
            template = await prompt.run();
          }
        } else {
          template = await prompt.run();
        }

        spinner.start();
        // copy the template
        await fs.copy(
          path.resolve(__dirname, `../../../templates/${template}`),
          projectPath,
          {
            overwrite: true,
          }
        );

        // add gitignore
        await execa('npx', ['gitignore', 'node'], { cwd: projectPath });

        // update license year and author
        let license: string = await fs.readFile(
          path.resolve(projectPath, 'LICENSE'),
          { encoding: 'utf-8' }
        );

        license = license.replace(/<year>/, `${new Date().getFullYear()}`);

        // attempt to automatically derive author name
        let author = getAuthorName();

        if (!author) {
          spinner.stop();
          const licenseInput = new Input({
            name: 'author',
            message: 'Who is the package author?',
          });
          author = await licenseInput.run();
          setAuthorName(author);
          spinner.start();
        }

        license = license.replace(/<author>/, author.trim());

        await fs.writeFile(path.resolve(projectPath, 'LICENSE'), license, {
          encoding: 'utf-8',
        });

        const templateConfig = templates[template as keyof typeof templates];
        const generatePackageJson = composePackageJson(templateConfig);

        // Install deps
        process.chdir(projectPath);
        const pkgJson = generatePackageJson({ name: safeName, author });

        const nodeVersionReq = getNodeEngineRequirement(pkgJson);
        if (
          nodeVersionReq &&
          !semver.satisfies(process.version, nodeVersionReq)
        ) {
          spinner.fail(messages.incorrectNodeVersion(nodeVersionReq));
          process.exit(1);
        }

        await fs.outputJSON(path.resolve(projectPath, 'package.json'), pkgJson);
        spinner.succeed(`Created ${chalk.bold.green(safeName)}`);
        await messages.start(safeName);
      } catch (error) {
        spinner.fail(`Failed to create ${chalk.bold.red(safeName)}`);
        logError(error);
        process.exit(1);
      }

      const templateConfig = templates[template as keyof typeof templates];
      const { dependencies: deps } = templateConfig;

      const installSpinner = ora(messages.installing(deps.sort())).start();
      try {
        const cmd = await getInstallCmd();
        await execa(cmd, getInstallArgs(cmd, deps));
        // Initialize ts-jest
        await execa('npx', ['ts-jest', 'config:init']);
        installSpinner.succeed(
          'Installed dependencies and initialized ts-jest'
        );
        console.log(await messages.start(name));
      } catch (error) {
        installSpinner.fail('Failed to install dependencies');
        logError(error);
        process.exit(1);
      }
    }
  );
}
