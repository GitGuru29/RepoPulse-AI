const test = require('node:test');
const assert = require('node:assert/strict');

const { GitHubClient } = require('../dist/utils/github');
const { InvalidRepoInputError } = require('../dist/errors');

test('parseRepoString accepts owner/repo and GitHub URLs', () => {
    assert.deepEqual(GitHubClient.parseRepoString('octocat/Hello-World'), {
        owner: 'octocat',
        repo: 'Hello-World'
    });

    assert.deepEqual(
        GitHubClient.parseRepoString('https://github.com/openai/openai-node.git'),
        { owner: 'openai', repo: 'openai-node' }
    );

    assert.deepEqual(
        GitHubClient.parseRepoString('https://github.com/vercel/next.js/?tab=readme#section'),
        { owner: 'vercel', repo: 'next.js' }
    );
});

test('parseRepoString rejects invalid input with typed error', () => {
    assert.throws(
        () => GitHubClient.parseRepoString('https://github.com/owner-only'),
        (error) => error instanceof InvalidRepoInputError
    );

    assert.throws(
        () => GitHubClient.parseRepoString(''),
        (error) => error instanceof InvalidRepoInputError
    );
});
