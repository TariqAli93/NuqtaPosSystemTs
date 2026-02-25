import { test, _electron as electron, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';
// Path to built electron app
// Determine based on manual build or what?
// Ideally we run against 'electron .' using the package.json main
// But this requires 'electron' to be in path or accessible.
// _electron.launch() can take 'executablePath' and 'args'.
const appPath = path.resolve(__dirname, '../apps/electron/out/main/index.js'); // Checking if this exists
// If main/index.js exists, we assume user built the app.
// If not, we might need to point to src... but that requires ts-node/electron-vite.
// Let's assume 'test:e2e' is run after 'build'.
test.describe('Electron E2E', () => {
    let electronApp;
    let dbPath;
    test.beforeAll(async () => {
        // secure a temp db path
        dbPath = path.join(os.tmpdir(), `e2e-test-${randomUUID()}.db`);
        process.env.NUQTA_TEST_DB_PATH = dbPath;
        // Check if app entry exists
        if (!fs.existsSync(appPath)) {
            console.warn('App build not found at ' + appPath + '. Running against source? Might fail.');
            // Fallback: point to apps/electron assuming package.json main resolves?
            // electron.launch({ args: ['apps/electron'] }) might work if deps are ready.
        }
        electronApp = await electron.launch({
            args: [path.resolve(__dirname, '../apps/electron')], // This points to package.json which points to main
            env: {
                ...process.env,
                NUQTA_TEST_DB_PATH: dbPath,
                NODE_ENV: 'test',
            },
        });
    });
    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
        // Cleanup DB
        if (fs.existsSync(dbPath)) {
            try {
                fs.unlinkSync(dbPath);
            }
            catch { }
        }
    });
    test('app launches and shows window', async () => {
        const window = await electronApp.firstWindow();
        const title = await window.title();
        // Check title or basic selector
        // Depending on what loads.
        // Assuming Login page or Dashboard.
        expect(title).toBeDefined();
        // Take screenshot
        await window.screenshot({ path: 'e2e/screenshots/launch.png' });
    });
});
