/**
 * Gabi Hub — k6 Load Test
 * Tests API performance under load.
 * 
 * Run: k6 run tests/load/load_test.js --env API_URL=https://gabi-api-3yxil5gluq-rj.a.run.app
 * 
 * Scenarios:
 *   1. Health check (smoke)
 *   2. Auth flow (50 VUs)
 *   3. Chat endpoint (30 VUs)
 *   4. Document upload (10 VUs)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const latencyP95 = new Trend('latency_p95');

const API_URL = __ENV.API_URL || 'http://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export const options = {
    scenarios: {
        // Scenario 1: Smoke test — health endpoint
        smoke: {
            executor: 'constant-vus',
            vus: 5,
            duration: '30s',
            exec: 'healthCheck',
            tags: { scenario: 'smoke' },
        },
        // Scenario 2: Auth flow — moderate load
        auth_flow: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 0 },
            ],
            exec: 'authFlow',
            tags: { scenario: 'auth' },
            startTime: '30s',
        },
        // Scenario 3: Chat endpoints — sustained load
        chat_load: {
            executor: 'constant-arrival-rate',
            rate: 30,
            timeUnit: '1s',
            duration: '2m',
            preAllocatedVUs: 50,
            maxVUs: 100,
            exec: 'chatEndpoints',
            tags: { scenario: 'chat' },
            startTime: '2m',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],   // p95 < 3s
        http_req_failed: ['rate<0.05'],      // error rate < 5%
        error_rate: ['rate<0.05'],
    },
};

// ── Scenario Functions ──

export function healthCheck() {
    group('Health Check', function () {
        const res = http.get(`${API_URL}/health`);
        check(res, {
            'health status 200': (r) => r.status === 200,
            'health latency < 500ms': (r) => r.timings.duration < 500,
        });
        errorRate.add(res.status !== 200);
        latencyP95.add(res.timings.duration);
    });
    sleep(1);
}

export function authFlow() {
    group('Auth Flow', function () {
        // GET /api/auth/me (with token)
        const res = http.get(`${API_URL}/api/auth/me`, { headers });
        check(res, {
            'auth me status 200 or 401': (r) => r.status === 200 || r.status === 401,
            'auth latency < 1s': (r) => r.timings.duration < 1000,
        });
        errorRate.add(res.status >= 500);
        latencyP95.add(res.timings.duration);
    });
    sleep(0.5);
}

export function chatEndpoints() {
    group('Chat Endpoints', function () {
        // GET /api/chat/sessions
        const res = http.get(`${API_URL}/api/chat/sessions`, { headers });
        check(res, {
            'sessions status ok': (r) => r.status === 200 || r.status === 401,
            'sessions latency < 2s': (r) => r.timings.duration < 2000,
        });
        errorRate.add(res.status >= 500);
        latencyP95.add(res.timings.duration);
    });
    sleep(0.2);
}

// ── Summary ──

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, opts) {
    const metrics = data.metrics;
    return `
=== GABI LOAD TEST RESULTS ===

Requests:     ${metrics.http_reqs?.values?.count || 0}
Failed:       ${metrics.http_req_failed?.values?.rate?.toFixed(4) || 0}
Duration p95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 0}ms
Error Rate:   ${metrics.error_rate?.values?.rate?.toFixed(4) || 0}

Thresholds:
  p95 < 3000ms: ${metrics.http_req_duration?.thresholds?.['p(95)<3000']?.ok ? 'PASS ✅' : 'FAIL ❌'}
  errors < 5%:  ${metrics.http_req_failed?.thresholds?.['rate<0.05']?.ok ? 'PASS ✅' : 'FAIL ❌'}
`;
}
