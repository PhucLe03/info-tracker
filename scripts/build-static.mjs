import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const appApiDir = path.join(process.cwd(), 'app', 'api');
const tempApiDir = path.join(process.cwd(), 'api_temp');
const nextDir = path.join(process.cwd(), '.next');

console.log('Build configuration:');
console.log('- NEXT_PUBLIC_BASE_PATH:', process.env.NEXT_PUBLIC_BASE_PATH || '(not set)');
console.log('- NEXT_PUBLIC_STATIC_MODE:', process.env.NEXT_PUBLIC_STATIC_MODE || '(not set)');

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
    console.error('\nError: Failed to move app/api folder:', err.message);
    console.error('Tip: This usually happens on Windows if the Next.js dev server (npm run dev) is still running and locking the directory. Please stop the dev server and try building again.\n');
    process.exit(1);
  }
}

let buildFailed = false;
try {
  console.log('Running next build...');
  execSync('npx next build', { stdio: 'inherit', shell: true });
} catch (err) {
  console.error('Build execution failed:', err.message);
  buildFailed = true;
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

if (buildFailed) {
  process.exit(1);
}
