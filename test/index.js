var coinSelect = require('../')
var fixtures = require('./fixtures')
var tape = require('tape')
var utils = require('./_utils')

fixtures.forEach(function (f) {
  tape(f.description, function (t) {
    var inputs = utils.expand(f.inputs, true)
    var outputs = utils.expand(f.outputs)
    var actual = coinSelect(inputs, outputs, f.feeRate)

    t.same(actual, f.expected)
    if (actual.inputs) {
      var feedback = coinSelect(actual.inputs, actual.outputs, f.feeRate)
      t.same(feedback, f.expected)
    }

    t.end()
  })
})

tape('change script is used for tx size and dust limit', function (t) {
  var utxos = [{ value: 100000 }]

  // p2tr change (34 bytes script): tx is 10 + 148 + 34 + 43 = 235 bytes, dust limit is 330
  var result = coinSelect(utxos, [{ value: 100000 - 235 - 330 }], 1, { changeScript: { length: 34 } })
  t.same(result.outputs, [{ value: 100000 - 235 - 330 }, { value: 330 }])
  t.equal(result.fee, 235)

  // change of 329 would be rejected by the network as dust, so it goes to fee
  result = coinSelect(utxos, [{ value: 100000 - 235 - 329 }], 1, { changeScript: { length: 34 } })
  t.same(result.outputs, [{ value: 100000 - 235 - 329 }])
  t.equal(result.fee, 235 + 329)

  // no change script, p2pkh is assumed: tx is 226 bytes, dust limit is 546
  result = coinSelect(utxos, [{ value: 100000 - 226 - 545 }], 1)
  t.same(result.outputs, [{ value: 100000 - 226 - 545 }])
  t.equal(result.fee, 226 + 545)

  t.end()
})

tape('txExtraBytes is paid for', function (t) {
  var utxos = [{ value: 100000 }]

  t.equal(coinSelect(utxos, [{ value: 50000 }], 3).fee, 3 * 226)
  t.equal(coinSelect(utxos, [{ value: 50000 }], 3, { txExtraBytes: 1 }).fee, 3 * 227)

  // without change: tx is 10 + 148 + 34 = 192 bytes, 1 sat is not enough to pay for the extra byte
  t.equal(coinSelect([{ value: 10192 }], [{ value: 10000 }], 1).fee, 192)
  t.same(coinSelect([{ value: 10192 }], [{ value: 10000 }], 1, { txExtraBytes: 1 }), { fee: 193 })
  t.equal(coinSelect([{ value: 10193 }], [{ value: 10000 }], 1, { txExtraBytes: 1 }).fee, 193)

  t.end()
})

tape('invalid options give no solution instead of a wrong one', function (t) {
  var utxos = [{ value: 100000 }]
  var outputs = [{ value: 10000 }]

  t.same(coinSelect(utxos, outputs, 1, { changeScript: {} }), {})
  t.same(coinSelect(utxos, outputs, 1, { changeScript: { length: '34' } }), {})
  t.same(coinSelect(utxos, outputs, 1, { length: 34 }), {})
  t.same(coinSelect(utxos, outputs, 1, 'bc1qaddress'), {})
  t.same(coinSelect(utxos, outputs, 1, { txExtraBytes: -1 }), {})
  t.same(coinSelect(utxos, outputs, 1, { changeScript: { length: 1e6 } }), {}, 'would otherwise burn whole change as fee')
  t.same(coinSelect(utxos, outputs, 1, false), {})
  t.same(coinSelect(utxos, outputs, 1, 0), {})
  t.same(coinSelect(utxos, outputs, 1, ''), {})
  t.same(coinSelect(utxos, outputs, 1, null), {})

  t.end()
})

tape('does not overpay up to relay dust limit when there is a better solution with change', function (t) {
  // spending only 10700 would leave 508 sats, which is below p2pkh dust limit so it can not be a change and would go to fee.
  // using bigger utxo and getting change back is cheaper
  var result = coinSelect([{ value: 10700 }, { value: 50000 }], [{ value: 10000 }], 1)
  t.same(result.inputs, [{ value: 50000 }])
  t.same(result.outputs, [{ value: 10000 }, { value: 50000 - 10000 - 226 }])
  t.equal(result.fee, 226)

  t.end()
})
