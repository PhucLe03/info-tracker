import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const appApiDir = path.join(process.cwd(), 'app', 'api');
const tempApiDir = path.join(process.cwd(), 'api_temp');
const nextDir = path.join(process.cwd(), '.next');

// 1. Clean the .next cache directory to avoid stale type validation errors
if (fs.existsSync(nextDir)) {
  console.log('Cleaning .next directory...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('Warning: Could not clean .next directory:', err.message);
  }
}

let moved = false;
if (fs.existsSync(appApiDir)) {
  console.log('Temporarily moving app/api to api_temp to bypass static export checks...');
  try {
    fs.renameSync(appApiDir, tempApiDir);
    moved = true;
  } catch (err) {
    console.error('Error: Failed to move app/api folder:', err.message);
    process.exit(1);
  }
}

try {
  console.log('Running next build...');
  execSync('npx next build', { stdio: 'inherit' });
} catch (err) {
  console.error('Build execution failed:', err.message);
  process.exit(1);
} finally {
  if (moved && fs.existsSync(tempApiDir)) {
    console.log('Restoring app/api from api_temp...');
    try {
      fs.renameSync(tempApiDir, appApiDir);
    } catch (err) {
      console.error('CRITICAL: Failed to restore app/api from api_temp! Please manually rename api_temp to app/api.', err.message);
      process.exit(1);
    }
  }
}
