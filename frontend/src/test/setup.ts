import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup only registers when test globals are enabled; do it manually.
afterEach(cleanup);
