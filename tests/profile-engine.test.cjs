const test = require('node:test');
const assert = require('node:assert/strict');
const Profile = require('../profile-engine.js');

test('first launch asks for a name until a valid profile name is saved', () => {
  assert.equal(Profile.needsSetup(''), true);
  assert.equal(Profile.needsSetup('  '), true);
  assert.equal(Profile.needsSetup('Asha'), false);
});

test('name is trimmed, bounded and safe for greeting text', () => {
  assert.equal(Profile.normalizeName('  Asha Rao  '), 'Asha Rao');
  assert.equal(Profile.normalizeName('x'.repeat(80)).length, 24);
  assert.equal(Profile.normalizeName('   '), '');
});

test('home greeting uses the saved username', () => {
  assert.equal(Profile.greeting('Asha'), 'Welcome Asha,');
});
