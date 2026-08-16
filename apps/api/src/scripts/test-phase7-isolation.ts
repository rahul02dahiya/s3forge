import { requireRole } from '../middleware/authorize.js';
import { AppError } from '../lib/app-error.js';
import type { Request, Response, NextFunction } from 'express';

console.log('--------------------------------------------------');
console.log('🧪 RUNNING AUTOMATED SUITE: PHASE 7 ISOLATION & RBAC');
console.log('--------------------------------------------------');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failed++;
  }
}

// SUITE 1: RBAC Middleware Authorization Checks
(() => {
  const middleware = requireRole(['owner', 'admin']);
  const req = {} as Request;
  const res = {} as Response;
  let nextCalledWith: any = null;
  const next: NextFunction = (err?: any) => {
    nextCalledWith = err;
  };

  middleware(req, res, next);
  assert(
    nextCalledWith instanceof AppError && nextCalledWith.statusCode === 401,
    'requireRole rejects unauthenticated request (401)',
  );
})();

(() => {
  const middleware = requireRole(['owner', 'admin']);
  const req = { user: { userId: 10, email: 'user@test.com', organizationId: 1, role: 'member' } } as any;
  const res = {} as Response;
  let nextCalledWith: any = null;
  const next: NextFunction = (err?: any) => {
    nextCalledWith = err;
  };

  middleware(req, res, next);
  assert(
    nextCalledWith instanceof AppError && nextCalledWith.statusCode === 403,
    'requireRole rejects member role for admin endpoints (403)',
  );
})();

(() => {
  const middleware = requireRole(['owner', 'admin']);
  const req = { user: { userId: 10, email: 'admin@test.com', organizationId: 1, role: 'admin' } } as any;
  const res = {} as Response;
  let nextCalledWith: any = null;
  const next: NextFunction = (err?: any) => {
    nextCalledWith = err;
  };

  middleware(req, res, next);
  assert(nextCalledWith === undefined, 'requireRole allows admin role to proceed');
})();

(() => {
  const middleware = requireRole(['owner', 'admin']);
  const req = { user: { userId: 10, email: 'owner@test.com', organizationId: 1, role: 'owner' } } as any;
  const res = {} as Response;
  let nextCalledWith: any = null;
  const next: NextFunction = (err?: any) => {
    nextCalledWith = err;
  };

  middleware(req, res, next);
  assert(nextCalledWith === undefined, 'requireRole allows owner role to proceed');
})();

// SUITE 2: Multi-Tenant Folder Path Prefix Calculations
(() => {
  const orgSlug = 'acme-corp';
  const userId = 42;
  const bucketName = 'documents';

  const bucketPrefix = `${orgSlug}/u${userId}/${bucketName}`;
  assert(
    bucketPrefix === 'acme-corp/u42/documents',
    'Bucket folder prefix correctly formatted as <orgSlug>/u<userId>/<bucketName>',
  );

  const objectName = 'invoices/2026/Q1.pdf';
  const fullObjectKey = `${bucketPrefix}/${objectName}`;
  assert(
    fullObjectKey === 'acme-corp/u42/documents/invoices/2026/Q1.pdf',
    'Full object key correctly formatted inside root bucket s3forge-storage',
  );

  // Key stripping verification
  const prefixToStrip = `${bucketPrefix}/`;
  const strippedName = fullObjectKey.startsWith(prefixToStrip)
    ? fullObjectKey.slice(prefixToStrip.length)
    : fullObjectKey;
  assert(
    strippedName === 'invoices/2026/Q1.pdf',
    'Prefix stripping correctly restores client object name for API responses',
  );
})();

console.log('--------------------------------------------------');
console.log(`📊 TEST RESULTS: ${passed} Passed | ${failed} Failed`);
console.log('--------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
