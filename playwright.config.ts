import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const adminAuthFile = path.resolve(__dirname, 'tests/admin/auth.json');
const ownerAuthFile = path.resolve(__dirname, 'tests/owner/auth.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.APP_BASE_URL ?? 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup-admin',
      testMatch: 'admin/auth/login.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-owner',
      testMatch: 'owner/login.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'login',
      testMatch: ['admin/auth/login.spec.ts', 'admin/auth/access.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'admin',
      dependencies: ['setup-admin'],
      testMatch: [
        'admin/dashboard/**/*.spec.ts',
        'admin/layanan/**/*.spec.ts',
        'admin/order/**/*.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminAuthFile,
      },
    },
    {
      name: 'owner',
      dependencies: ['setup-owner'],
      testMatch: 'owner/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ownerAuthFile,
      },
    },
  ],
});