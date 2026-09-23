const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requireTrustedOrigin } = require('../middlewares/origin');

test('state-changing browser requests require a trusted origin', () => {
    for (const origin of [undefined, 'null', 'https://untrusted.example']) {
        const res = { status(n) { this.statusCode = n; return this; }, json() {} };
        requireTrustedOrigin({ method: 'POST', path: '/api/users/login', get: () => origin }, res, () => assert.fail('must reject'));
        assert.equal(res.statusCode, 403);
    }
    let allowed = false;
    requireTrustedOrigin({ method: 'POST', path: '/api/users/login', get: () => process.env.CLIENT_URL || 'http://localhost:5173' }, {}, () => { allowed = true; });
    assert.equal(allowed, true);
});
