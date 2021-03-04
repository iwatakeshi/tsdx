import { readFileSync } from 'fs';
import { PackageJson } from '../types';
import AppPath from './app-path';
import * as JSONC from 'comment-json';
export default class App {
  static get package(): PackageJson {
    try {
      return JSONC.parse(readFileSync(AppPath.package, 'utf-8'));
    } catch {
      return { name: '' };
    }
  }
}
