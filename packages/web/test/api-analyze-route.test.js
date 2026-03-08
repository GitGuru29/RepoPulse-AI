const test = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');

const routeModule = require('../.next/server/app/api/analyze/route.js');
const GET = routeModule.routeModule.userland.GET;

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
