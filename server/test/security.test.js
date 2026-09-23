const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const express = require('express');
const session = require('express-session');
const WebSocket = require('ws');

const { requireCameraApiKey, requireVerifiedRole } = require('../middlewares/access');
const WebSocketService = require('../src/services/websocket.service');

test('unverified accounts cannot access protected campus data', () => {
    const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let nextCalled = false;
    requireVerifiedRole({ role: 'unverified' }, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    requireVerifiedRole({ role: 'teaching assistant' }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
});

test('camera API rejects missing and wrong keys before accepting the configured key', async () => {
    const previous = process.env.CAMERA_API_KEY;
    process.env.CAMERA_API_KEY = 'test-only-camera-key';
    const app = express();
    app.post('/camera', requireCameraApiKey, (_req, res) => res.sendStatus(204));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const url = `http://127.0.0.1:${server.address().port}/camera`;
        assert.equal((await fetch(url, { method: 'POST' })).status, 401);
        assert.equal((await fetch(url, { method: 'POST', headers: { 'x-camera-api-key': 'wrong' } })).status, 401);
        assert.equal((await fetch(url, { method: 'POST', headers: { 'x-camera-api-key': process.env.CAMERA_API_KEY } })).status, 204);
    } finally {
        server.close();
        if (previous === undefined) delete process.env.CAMERA_API_KEY;
        else process.env.CAMERA_API_KEY = previous;
    }
});

test('student, subject and material routes reject an anonymous request', async () => {
    const app = express();
    app.use((req, _res, next) => { req.isAuthenticated = () => false; next(); });
    app.use('/students', require('../routes/students.routes'));
    app.use('/subjects', require('../routes/subjects.routes'));
    app.use('/materials', require('../routes/materials.routes'));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        const root = `http://127.0.0.1:${server.address().port}`;
        for (const path of ['/students/list', '/students/view/any', '/subjects/view/any/attendance/excel/1', '/materials']) {
            assert.equal((await fetch(root + path)).status, 401, path);
        }
        assert.equal((await fetch(root + '/subjects/populate')).status, 401);
    } finally {
        server.close();
    }
});

test('WebSocket requires a signed session and rejects client attendance broadcasts', async () => {
    const app = express();
    const sessionMiddleware = session({
        secret: 'test-only-session-secret-with-adequate-length',
        resave: false,
        saveUninitialized: false,
    });
    app.use(sessionMiddleware);
    app.get('/login', (req, res) => {
        req.session.passport = { user: 'test-user' };
        res.sendStatus(204);
    });
    const server = createServer(app);
    WebSocketService.initialize(server, sessionMiddleware);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const root = `127.0.0.1:${server.address().port}`;
    try {
        const unauthenticated = new WebSocket(`ws://${root}/`);
        const rejected = await new Promise((resolve) => {
            unauthenticated.on('unexpected-response', (_req, response) => resolve(response.statusCode));
            unauthenticated.on('error', () => resolve(0));
        });
        assert.equal(rejected, 401);

        const login = await fetch(`http://${root}/login`);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const authenticated = new WebSocket(`ws://${root}/`, { headers: { Cookie: cookie } });
        await once(authenticated, 'open');
        authenticated.send(JSON.stringify({ type: 'attendance_update', data: { forged: true } }));
        const [response] = await once(authenticated, 'message');
        // A welcome event may arrive first; the next response must reject the forged event.
        const data = JSON.parse(response.toString());
        const rejection = data.type === 'error' ? data : JSON.parse((await once(authenticated, 'message'))[0].toString());
        assert.equal(rejection.type, 'error');
        authenticated.close();
        await once(authenticated, 'close');
    } finally {
        WebSocketService.shutdown();
        server.close();
    }
});
