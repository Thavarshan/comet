// jest.setup.ts

// Example: mocking a global variable or function
(global as any).__DEV__ = true;

// Example: adding a global function or variable for tests
// global.myCustomFunction = () => 'test';

import { config } from '@vue/test-utils';
import { createApp } from 'vue';

const app = createApp({});
(config.global as any).app = app;
