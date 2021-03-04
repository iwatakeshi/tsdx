import { realpathSync } from 'fs';
import path from 'path';

export default class AppPath {
  static get cwd() {
    return process.cwd();
  }

  static get directory() {
    // Make sure any symlinks in the project folder are resolved:
    // https://github.com/facebookincubator/create-react-app/issues/637
    return realpathSync(AppPath.cwd);
  }

  static resolve(...segments: string[]) {
    return path.resolve(AppPath.directory, ...segments);
  }

  static get root_directory() {
    return AppPath.resolve('.');
  }

  static get src_directory() {
    return AppPath.resolve('src');
  }

  static get dist_directory() {
    return AppPath.resolve('dist');
  }

  static get error_directory() {
    return AppPath.resolve('errors');
  }

  static get package() {
    return AppPath.resolve('package.json');
  }

  static get appconfig() {
    return AppPath.resolve('tsdx.config.js');
  }

  static get tsconfig() {
    return AppPath.resolve('tsconfig.json');
  }

  static get jestconfig() {
    return AppPath.resolve('jest.config.js');
  }

  static get errors() {
    return AppPath.resolve('errors/codes.json');
  }

  static get progress_cache() {
    return AppPath.resolve('node_modules/.cache/.progress-estimator');
  }
}
