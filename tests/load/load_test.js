/**
 * Gabi Hub — Load Testing Script (k6)
 * Usage: k6 run tests/load/load_test.js
 * Docs: https://k6.io/docs/
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ──
const errorRate = new Rate('errors');
const authLatency = new Trend('auth_latency');
const chatLatency = new Trend('chat_latency');
const ragLatency = new Trend('rag_latency');

// ── Configuration ──
const BASE_URL = __ENV.API_URL || 'https://gabi-api-staging-935866797303.us-central1.run.app';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'REPLACE_WITH_TOKEN';

export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Ramp up
        { duration: '1m', target: 25 },    // Sustained load
        { duration: '2m', target: 50 },    // Peak load
        { duration: '30s', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000', 'p(99)<5000'],  // API latency
        errors: ['rate<0.05'],                              // Error rate < 5%
        auth_latency: ['p(95)<500'],
        chat_latency: ['p(95)<5000'],
        rag_latency: ['p(95)<2000'],
    },
};

const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
};

// ── Scenarios ──

export default function () {
    group('Health Check', function () {
        const res = http.get(`${BASE_URL}/health`);
        check(res, {
            'health: status 200': (r) => r.status === 200,
            'health: returns ok': (r) => r.json('status') === 'ok',
        });
        errorRate.add(res.status !== 200);
    });

    group('Readiness Check', function () {
        const res = http.get(`${BASE_URL}/health/ready`);
        check(res, {
            'ready: status 200': (r) => r.status === 200,
        });
        errorRate.add(res.status !== 200);
    });

    group('Auth - Me', function () {
        const start = Date.now();
        const res = http.post(`${BASE_URL}/api/auth/me`, null, { headers });
        authLatency.add(Date.now() - start);
        check(res, {
            'auth: status 200': (r) => r.status === 200,
        });
        errorRate.add(res.status >= 400);
    });

    group('Law Agent - Chat', function () {
        const start = Date.now();
        const payload = JSON.stringify({
            message: 'Quais as exigências da resolução BCB 355 sobre governança?',
            session_id: null,
        });
        const res = http.post(`${BASE_URL}/api/law/agent`, payload, { headers });
        chatLatency.add(Date.now() - start);
        check(res, {
            'law: status 200': (r) => r.status === 200 || r.status === 201,
            'law: has response': (r) => r.body.length > 0,
        });
        errorRate.add(res.status >= 400);
    });

    sleep(1);
}

// ── Smoke Test (quick validation) ──
export function smoke() {
    const res = http.get(`${BASE_URL}/health/ready`);
    check(res, { 'smoke: ready': (r) => r.status === 200 });
}
