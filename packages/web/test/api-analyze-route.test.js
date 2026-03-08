const test = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');

const routeModule = require('../.next/server/app/api/analyze/route.js');
const GET = routeModule.routeModule.userland.GET;
const POST = routeModule.routeModule.userland.POST;

test('GET /api/analyze returns 400 when url is missing', async () => {
    const request = new NextRequest('http://localhost/api/analyze');
    const response = await GET(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /Missing 'url'/);
});

test('GET /api/analyze returns analyzer output on success', async () => {
    const originalFetch = global.fetch;
    global.fetch = async (input, init) => {
        const url = String(input);
        const pathname = new URL(url).pathname;

        if (pathname === '/repos/openai/openai-node/languages') {
            return new Response(
                JSON.stringify({ TypeScript: 1000, JavaScript: 500 }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === '/repos/openai/openai-node/contributors') {
            return new Response(
                JSON.stringify([{ login: 'alice', contributions: 100 }]),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === '/repos/openai/openai-node') {
            return new Response(
                JSON.stringify({
                    owner: { login: 'openai' },
                    name: 'openai-node',
                    description: 'sdk',
                    stargazers_count: 10,
                    forks_count: 2,
                    watchers_count: 10,
                    open_issues_count: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === '/graphql') {
            const repository = {
                openPRs: { totalCount: 1 },
                closedPRs: { totalCount: 5 },
                stalePRs: { totalCount: 0 },
                mergedPRs: {
                    nodes: [
                        {
                            createdAt: '2025-01-01T00:00:00.000Z',
                            mergedAt: '2025-01-03T00:00:00.000Z'
                        }
                    ]
                },
                openIssues: { totalCount: 2 },
                closedIssues: { totalCount: 20 },
                staleIssues: { totalCount: 1 },
                packageJson: { __typename: 'Blob' },
                packageLock: { __typename: 'Blob' },
                yarnLock: null,
                pnpmLock: null,
                requirementsTxt: null,
                pipfile: null,
                poetryLock: null,
                goMod: null,
                cargoToml: null,
                pomXml: null,
                gradleBuild: null,
                gemfile: null,
                composerJson: null,
                dependabotYml: { __typename: 'Blob' },
                dependabotYaml: null
            };
            return new Response(
                JSON.stringify({
                    data: { repository }
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        return new Response(JSON.stringify({ message: `Unhandled test URL: ${url}` }), { status: 404 });
    };

    try {
        const request = new NextRequest('http://localhost/api/analyze?url=openai/openai-node');
        const response = await GET(request);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.stats.owner, 'openai');
        assert.ok(typeof body.healthScore === 'number');
    } finally {
        global.fetch = originalFetch;
    }
});

test('GET /api/analyze returns 500 when analyzer throws', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
        throw new Error('boom');
    };

    try {
        const request = new NextRequest('http://localhost/api/analyze?url=openai/openai-node-cache-bypass');
        const response = await GET(request);
        const body = await response.json();

        assert.equal(response.status, 500);
        assert.ok(typeof body.error === 'string');
        assert.ok(body.error.length > 0);
    } finally {
        global.fetch = originalFetch;
    }
});

test('POST /api/analyze returns 400 when url is missing', async () => {
    const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
    });
    const response = await POST(request);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /Missing 'url'/);
});

test('POST /api/analyze uses provided token for private repo access', async () => {
    const originalFetch = global.fetch;
    const authHeaders = [];
    const repoPath = '/repos/openai/openai-node-private';

    global.fetch = async (input, init) => {
        const url = String(input);
        const pathname = new URL(url).pathname;
        const requestHeaders = typeof input?.headers?.get === 'function' ? input.headers : null;
        const headers = init?.headers;
        const authHeader =
            (requestHeaders?.get('authorization') || requestHeaders?.get('Authorization')) ||
            (typeof headers?.get === 'function'
                ? (headers.get('authorization') || headers.get('Authorization'))
                : (headers?.authorization || headers?.Authorization));
        if (authHeader) authHeaders.push(authHeader);

        if (pathname === `${repoPath}/languages`) {
            return new Response(
                JSON.stringify({ TypeScript: 1000, JavaScript: 500 }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === `${repoPath}/contributors`) {
            return new Response(
                JSON.stringify([{ login: 'alice', contributions: 100 }]),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === repoPath) {
            return new Response(
                JSON.stringify({
                    owner: { login: 'openai' },
                    name: 'openai-node-private',
                    description: 'sdk',
                    stargazers_count: 10,
                    forks_count: 2,
                    watchers_count: 10,
                    open_issues_count: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === '/graphql') {
            const repository = {
                openPRs: { totalCount: 1 },
                closedPRs: { totalCount: 5 },
                stalePRs: { totalCount: 0 },
                mergedPRs: {
                    nodes: [
                        {
                            createdAt: '2025-01-01T00:00:00.000Z',
                            mergedAt: '2025-01-03T00:00:00.000Z'
                        }
                    ]
                },
                openIssues: { totalCount: 2 },
                closedIssues: { totalCount: 20 },
                staleIssues: { totalCount: 1 },
                packageJson: { __typename: 'Blob' },
                packageLock: { __typename: 'Blob' },
                yarnLock: null,
                pnpmLock: null,
                requirementsTxt: null,
                pipfile: null,
                poetryLock: null,
                goMod: null,
                cargoToml: null,
                pomXml: null,
                gradleBuild: null,
                gemfile: null,
                composerJson: null,
                dependabotYml: { __typename: 'Blob' },
                dependabotYaml: null
            };
            return new Response(
                JSON.stringify({
                    data: { repository }
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        return new Response(JSON.stringify({ message: `Unhandled test URL: ${url}` }), { status: 404 });
    };

    try {
        const request = new NextRequest('http://localhost/api/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                url: 'openai/openai-node-private',
                token: 'ghp_test_private_token'
            })
        });
        const response = await POST(request);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.stats.owner, 'openai');
        assert.ok(authHeaders.some((header) => String(header).includes('ghp_test_private_token')));
    } finally {
        global.fetch = originalFetch;
    }
});

test('POST /api/analyze supports public repos without token via REST fallback', async () => {
    const originalFetch = global.fetch;
    const repoPath = '/repos/openai/public-no-token';

    global.fetch = async (input) => {
        const url = String(input);
        const parsed = new URL(url);
        const pathname = parsed.pathname;

        if (pathname === '/graphql') {
            return new Response(
                JSON.stringify({ message: 'Requires authentication' }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === repoPath) {
            return new Response(
                JSON.stringify({
                    owner: { login: 'openai' },
                    name: 'public-no-token',
                    description: 'public repo',
                    stargazers_count: 50,
                    forks_count: 7,
                    watchers_count: 50,
                    open_issues_count: 8,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === `${repoPath}/languages`) {
            return new Response(
                JSON.stringify({ TypeScript: 900, JavaScript: 300 }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === `${repoPath}/contributors`) {
            return new Response(
                JSON.stringify([{ login: 'alice', contributions: 75 }, { login: 'bob', contributions: 25 }]),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === `${repoPath}/pulls`) {
            return new Response(
                JSON.stringify([
                    { created_at: '2025-01-01T00:00:00.000Z', merged_at: '2025-01-04T00:00:00.000Z' },
                    { created_at: '2025-01-05T00:00:00.000Z', merged_at: null }
                ]),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname === '/search/issues') {
            const q = parsed.searchParams.get('q') || '';
            let totalCount = 0;
            if (q.includes('is:pr is:open updated:<')) totalCount = 1;
            else if (q.includes('is:pr is:open')) totalCount = 4;
            else if (q.includes('is:pr is:closed')) totalCount = 20;
            else if (q.includes('is:issue is:open updated:<')) totalCount = 2;
            else if (q.includes('is:issue is:open')) totalCount = 7;
            else if (q.includes('is:issue is:closed')) totalCount = 30;

            return new Response(
                JSON.stringify({ total_count: totalCount, incomplete_results: false, items: [] }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            );
        }

        if (pathname.startsWith(`${repoPath}/contents/`)) {
            const filePath = decodeURIComponent(pathname.split('/contents/')[1] || '');
            const existingFiles = new Set(['package.json', 'package-lock.json', '.github/dependabot.yml']);
            if (existingFiles.has(filePath)) {
                return new Response(
                    JSON.stringify({ name: filePath, path: filePath, type: 'file' }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                );
            }
            return new Response(
                JSON.stringify({ message: 'Not Found' }),
                { status: 404, headers: { 'content-type': 'application/json' } }
            );
        }

        return new Response(JSON.stringify({ message: `Unhandled test URL: ${url}` }), { status: 404 });
    };

    try {
        const request = new NextRequest('http://localhost/api/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                url: 'openai/public-no-token'
            })
        });
        const response = await POST(request);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.stats.repo, 'public-no-token');
        assert.equal(body.pullRequests.openPRs, 4);
        assert.equal(body.issues.staleIssues, 2);
    } finally {
        global.fetch = originalFetch;
    }
});
