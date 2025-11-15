import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const BASE_PROTOCOL = BASE_URL.startsWith('https://') ? 'https' : 'http';
const BASE_HOST = BASE_URL.replace(/^https?:\/\//, '').split('/')[0];
const BASE_ORIGIN = `${BASE_PROTOCOL}://${BASE_HOST}`;
const API_TOKEN = __ENV.API_TOKEN || '';
const SB_ACCESS_TOKEN = __ENV.SB_ACCESS_TOKEN || API_TOKEN;
const ACCOUNT_ID = __ENV.ACCOUNT_ID || '';

export const options = {
  scenarios: {
    fast_requests: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '1m',
      exec: 'hitStandardEndpoints',
    },
    sync_burst: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.SYNC_USERS || 3),
      iterations: Number(__ENV.SYNC_ITERATIONS || 5),
      exec: 'triggerSync',
      startTime: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Accept up to 5% failures for testing
  },
};

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (API_TOKEN && !SB_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  return { headers };
}

function ensureSessionCookie() {
  if (!SB_ACCESS_TOKEN) return;
  const jar = http.cookieJar();
  jar.set(BASE_ORIGIN, 'sb-access-token', SB_ACCESS_TOKEN, {
    path: '/',
    secure: BASE_PROTOCOL === 'https',
  });
}

export function hitStandardEndpoints() {
  ensureSessionCookie();
  const paths = [
    '/api/locations',
    '/api/locations/stats',
    '/api/reviews',
    '/api/dashboard/overview',
  ];

  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${BASE_URL}${path}`, authHeaders());

  check(res, {
    'status is 200/304/409': (r) => [200, 304, 409].includes(r.status),
  });

  sleep(0.5);
}

export function triggerSync() {
  ensureSessionCookie();
  if (!ACCOUNT_ID) {
    console.warn('ACCOUNT_ID is missing; skipping sync scenario');
    sleep(1);
    return;
  }

  const payload = JSON.stringify({
    accountId: ACCOUNT_ID,
    syncType: 'full',
  });

  const res = http.post(`${BASE_URL}/api/gmb/sync`, payload, authHeaders());

  check(res, {
    'sync status accepted': (r) => [200, 202, 409].includes(r.status),
  });

  sleep(5); // Sleep to simulate user waiting between retries
}

