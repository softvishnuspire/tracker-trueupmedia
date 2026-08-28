/**
 * Load & Stress Test Verification Script
 * Simulates high concurrent traffic against backend endpoints to verify stability and latency.
 */

const http = require('http');

const TARGET_HOST = process.env.TARGET_HOST || 'localhost';
const TARGET_PORT = process.env.TARGET_PORT || 3001;
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 200;

function makeRequest(path) {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = http.get({
            host: TARGET_HOST,
            port: TARGET_PORT,
            path: path,
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const duration = Date.now() - start;
                resolve({ success: res.statusCode === 200, statusCode: res.statusCode, duration });
            });
        });

        req.on('error', (err) => {
            const duration = Date.now() - start;
            resolve({ success: false, error: err.message, duration });
        });

        req.on('timeout', () => {
            req.destroy();
            const duration = Date.now() - start;
            resolve({ success: false, error: 'TIMEOUT', duration });
        });
    });
}

async function runLoadTest() {
    console.log(`🚀 Starting Load Test: ${TOTAL_REQUESTS} total requests with batch size ${CONCURRENT_REQUESTS}...`);
    console.log(`Target: http://${TARGET_HOST}:${TARGET_PORT}\n`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
        const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i);
        const batchPromises = Array.from({ length: batchSize }, () => makeRequest('/health'));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const durations = results.map(r => r.duration).sort((a, b) => a - b);
    const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];
    const p95Duration = durations[Math.floor(durations.length * 0.95)];

    console.log('=============== LOAD TEST RESULTS ===============');
    console.log(`Total Completed: ${results.length}`);
    console.log(`Successful (200 OK): ${successful.length}`);
    console.log(`Failed / Timed Out: ${failed.length}`);
    console.log(`Total Duration: ${totalTime} ms`);
    console.log(`Throughput: ${(TOTAL_REQUESTS / (totalTime / 1000)).toFixed(2)} req/sec`);
    console.log(`Min Latency: ${minDuration} ms`);
    console.log(`Max Latency: ${maxDuration} ms`);
    console.log(`Avg Latency: ${avgDuration} ms`);
    console.log(`P95 Latency: ${p95Duration} ms`);
    console.log('=================================================\n');

    if (failed.length === 0) {
        console.log('✅ EXCELLENT! Zero timeouts and zero errors under load.');
        process.exit(0);
    } else {
        console.error(`⚠️ WARNING: ${failed.length} requests failed or timed out.`);
        process.exit(1);
    }
}

runLoadTest();
