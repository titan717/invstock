const test = require('node:test');
const assert = require('node:assert/strict');
const Options = require('../options-engine.js');

test('prices an at-the-money call with positive premium and delta', () => {
  const q = Options.price({ spot: 100, strike: 100, days: 30, volatility: 0.25, rate: 0.04, type: 'call' });
  assert.ok(q.premium > 0);
  assert.ok(q.delta > 0.5 && q.delta < 1);
  assert.ok(q.gamma > 0 && q.vega > 0 && q.theta < 0);
});

test('put-call parity holds for matched European options', () => {
  const call = Options.price({ spot: 100, strike: 105, days: 60, volatility: 0.3, rate: 0.04, type: 'call' });
  const put = Options.price({ spot: 100, strike: 105, days: 60, volatility: 0.3, rate: 0.04, type: 'put' });
  const t = 60 / 365;
  assert.ok(Math.abs((call.premium - put.premium) - (100 - 105 * Math.exp(-0.04 * t))) < 1e-8);
});

test('expiry payoff and break-even distinguish calls and puts', () => {
  assert.equal(Options.payoff({ type: 'call', strike: 100, premium: 5, spotAtExpiry: 112 }), 7);
  assert.equal(Options.payoff({ type: 'put', strike: 100, premium: 5, spotAtExpiry: 88 }), 7);
  assert.equal(Options.breakEven({ type: 'call', strike: 100, premium: 5 }), 105);
  assert.equal(Options.breakEven({ type: 'put', strike: 100, premium: 5 }), 95);
});

test('rejects invalid inputs rather than producing NaN quotes', () => {
  assert.throws(() => Options.price({ spot: 0, strike: 100, days: 30, volatility: .2, rate: .04, type: 'call' }), /positive/);
});
