import * as fs from 'fs-extra';
import AppPath from '../utils/app-path';

const progressEstimator = require('progress-estimator');

export async function createProgressEstimator() {
  await fs.ensureDir(AppPath.progress_cache);
  return progressEstimator({
    // All configuration keys are optional, but it's recommended to specify a storage location.
    storagePath: AppPath.progress_cache,
  });
}
