const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../models/User');
const PassportConfig = require('../src/config/passport.config');

test('registration saves a valid unverified account with one password hash', async () => {
    const findOne = User.findOne;
    const insertOne = User.collection.insertOne;
    let saved;
    try {
        User.findOne = () => ({ lean: async () => null });
        User.collection.insertOne = async (document) => {
            saved = document;
            return { acknowledged: true, insertedId: document._id };
        };
        PassportConfig.configureLocalStrategy();
        const password = 'Test-only-Password-42';
        const user = await new Promise((resolve, reject) => {
            passport._strategy('local-register')._verify(
                { body: { name: 'Test Student', gender: 'not_specified' } },
                'student@example.test', password,
                (err, result) => err ? reject(err) : resolve(result)
            );
        });
        assert.equal(user.role, 'unverified');
        assert.equal(saved.gender, undefined);
        assert.notEqual(saved.password, password);
        assert.equal(await bcrypt.compare(password, saved.password), true);
    } finally {
        User.findOne = findOne;
        User.collection.insertOne = insertOne;
    }
});

test('OAuth-only accounts validate without a password or elevated role', async () => {
    const user = new User({ name: 'OAuth Student', email: 'oauth@example.test', googleId: 'test-id' });
    await user.validate();
    assert.equal(user.role, 'unverified');
    assert.equal(user.password, undefined);
});
