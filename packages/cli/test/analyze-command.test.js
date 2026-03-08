const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('CLI smoke test: analyze command help renders successfully', () => {
    const cliRoot = path.resolve(__dirname, '..');
    const result = spawnSync('node', ['dist/index.js', 'analyze', '--help'], {
        cwd: cliRoot,
        encoding: 'utf-8'
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Analyze a GitHub repository/i);
    assert.match(result.stdout, /Usage:/i);
});
