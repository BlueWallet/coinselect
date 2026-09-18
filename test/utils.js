var tape = require('tape')
var utils = require('../utils')

tape('utils', function (t) {
  t.test('uintOrNaN', function (t) {
    t.plan(8)

    t.equal(utils.uintOrNaN(1), 1)
    t.equal(isNaN(utils.uintOrNaN('')), true)
    t.equal(isNaN(utils.uintOrNaN(Infinity)), true)
    t.equal(isNaN(utils.uintOrNaN(NaN)), true)
    t.equal(isNaN(utils.uintOrNaN('1')), true)
    t.equal(isNaN(utils.uintOrNaN('1.1')), true)
    t.equal(isNaN(utils.uintOrNaN(1.1)), true)
    t.equal(isNaN(utils.uintOrNaN(-1)), true)
  })

  t.test('positiveNumOrNaN', function (t) {
    t.plan(8)

    t.equal(utils.positiveNumOrNaN(1), 1)
    t.equal(isNaN(utils.positiveNumOrNaN('')), true)
    t.equal(isNaN(utils.positiveNumOrNaN(Infinity)), true)
    t.equal(isNaN(utils.positiveNumOrNaN(NaN)), true)
    t.equal(isNaN(utils.positiveNumOrNaN('1')), true)
    t.equal(isNaN(utils.positiveNumOrNaN('1.1')), true)
    t.equal(isNaN(utils.positiveNumOrNaN(1.1)), false)
    t.equal(isNaN(utils.positiveNumOrNaN(-1)), true)
  })

  t.test('dustThreshold follows Bitcoin Core dust limits', function (t) {
    t.plan(8)

    // (output size + spending input size) * 3 sat/vB (default dustrelayfee)
    t.equal(utils.dustThreshold({}, 1), 546, 'unknown output is treated as p2pkh')
    t.equal(utils.dustThreshold({ script: { length: 25 } }, 1), 546, 'p2pkh')
    t.equal(utils.dustThreshold({ script: { length: 23 } }, 1), 540, 'p2sh')
    t.equal(utils.dustThreshold({ script: { length: 22 } }, 1), 294, 'p2wpkh')
    t.equal(utils.dustThreshold({ script: { length: 34 } }, 1), 330, 'p2wsh / p2tr')

    // on high fee rates output should still be worth spending
    t.equal(utils.dustThreshold({}, 10), 1480)
    t.equal(utils.dustThreshold({ script: { length: 22 } }, 10), 1480)
    t.equal(utils.dustThreshold({ script: { length: 22 } }, 1.5), 294)
  })

  t.test('isDust: relay limit is inclusive (as in Bitcoin Core), break-even check is strict', function (t) {
    t.plan(14)

    t.equal(utils.isDust(546, {}, 1), false)
    t.equal(utils.isDust(545, {}, 1), true)
    t.equal(utils.isDust(540, { script: { length: 23 } }, 1), false)
    t.equal(utils.isDust(539, { script: { length: 23 } }, 1), true)
    t.equal(utils.isDust(294, { script: { length: 22 } }, 1), false)
    t.equal(utils.isDust(293, { script: { length: 22 } }, 1), true)
    t.equal(utils.isDust(330, { script: { length: 34 } }, 1), false)
    t.equal(utils.isDust(329, { script: { length: 34 } }, 1), true)

    // no fee / low fee: relay limit still applies
    t.equal(utils.isDust(546, {}, 0), false)
    t.equal(utils.isDust(545, {}, 0), true)
    t.equal(utils.isDust(294, { script: { length: 22 } }, 0.1), false)

    // high fee rate: output that costs as much as it is worth to spend is dust
    t.equal(utils.isDust(1480, {}, 10), true)
    t.equal(utils.isDust(1481, {}, 10), false)
    t.equal(utils.isDust(NaN, {}, 1), true)
  })

  t.test('finalize does not create change below Bitcoin Core dust limit', function (t) {
    t.plan(14)

    var inputs = [{ value: 100000 }]
    // tx is 10 + 148 + 34 + 34 (change) = 226 bytes
    var result = utils.finalize(inputs, [{ value: 100000 - 226 - 545 }], 1)
    t.equal(result.outputs.length, 1, 'p2pkh change of 545 is not created')
    t.equal(result.fee, 226 + 545)

    result = utils.finalize(inputs, [{ value: 100000 - 226 - 546 }], 1)
    t.equal(result.outputs.length, 2, 'p2pkh change of 546 is created')
    t.equal(result.outputs[1].value, 546)

    // p2wpkh change: tx is 10 + 148 + 34 + 31 = 223 bytes, dust limit is 294
    result = utils.finalize(inputs, [{ value: 100000 - 223 - 294 }], 1, { changeScript: { length: 22 } })
    t.same(result.outputs[1], { value: 294 }, 'change script length is used for both tx size and dust limit')
    t.equal(result.fee, 223)

    // p2sh change: tx is 10 + 148 + 34 + 32 = 224 bytes, dust limit is 540
    result = utils.finalize(inputs, [{ value: 100000 - 224 - 539 }], 1, { changeScript: { length: 23 } })
    t.equal(result.outputs.length, 1)

    result = utils.finalize(inputs, [{ value: 100000 - 224 - 540 }], 1, { changeScript: { length: 23 } })
    t.same(result.outputs[1], { value: 540 }, 'p2sh change of 540 is created')

    // fractional fee rate: tx is 10 + 148 + 34 + 31 (p2wpkh change) + 1 (extra) = 224 bytes, fee is round(1.5 * 224) = 336
    result = utils.finalize(inputs, [{ value: 50000 }], 1.5, { changeScript: { length: 22 }, txExtraBytes: 1 })
    t.equal(result.fee, 336)
    t.equal(result.outputs[1].value, 100000 - 50000 - 336)

    // p2tr change: tx is 10 + 148 + 34 + 43 = 235 bytes, dust limit is 330
    result = utils.finalize(inputs, [{ value: 100000 - 235 - 329 }], 1, { changeScript: { length: 34 } })
    t.equal(result.outputs.length, 1)
    t.equal(result.fee, 235 + 329)

    // extra bytes (e.g. segwit marker & flag) are paid for
    result = utils.finalize(inputs, [{ value: 50000 }], 2, { txExtraBytes: 1 })
    t.equal(result.fee, 2 * (226 + 1))

    t.same(utils.finalize(inputs, [{ value: 50000 }], 2, { changeScript: {} }), {}, 'invalid options give no solution')
  })

  t.test('transactionBytes', function (t) {
    t.plan(8)

    var inputs = [{}]
    var outputs = [{}]
    t.equal(utils.transactionBytes(inputs, outputs), 192)
    t.equal(utils.transactionBytes(inputs, outputs, undefined), 192)
    t.equal(utils.transactionBytes(inputs, outputs, {}), 192)
    t.equal(utils.transactionBytes(inputs, outputs, { txExtraBytes: 1 }), 193)
    t.equal(utils.transactionBytes(inputs, outputs, { changeScript: { length: 34 } }), 192, 'change is not a part of it')

    // invalid options should never end up as a plausible looking size
    t.ok(isNaN(utils.transactionBytes(inputs, outputs, { txExtraBytes: '1' })))
    t.ok(isNaN(utils.transactionBytes(inputs, outputs, { txExtraBytes: -5 })))
    t.ok(isNaN(utils.transactionBytes(inputs, outputs, { txExtraBytes: 1.5 })))
  })

  t.test('checkOptions', function (t) {
    t.plan(21)

    t.equal(utils.checkOptions(undefined), true)
    t.equal(utils.checkOptions({}), true)
    t.equal(utils.checkOptions({ changeScript: { length: 34 } }), true)
    t.equal(utils.checkOptions({ txExtraBytes: 0 }), true)
    t.equal(utils.checkOptions({ changeScript: { length: 22 }, txExtraBytes: 1 }), true)

    t.equal(utils.checkOptions(null), false)
    t.equal(utils.checkOptions(false), false)
    t.equal(utils.checkOptions(0), false)
    t.equal(utils.checkOptions(''), false)
    t.equal(utils.checkOptions('bc1qaddress'), false)
    t.equal(utils.checkOptions({ length: 34 }), false, 'unknown keys are rejected, so a typo can not silently change the result')
    t.equal(utils.checkOptions({ changeScript: {} }), false)
    t.equal(utils.checkOptions({ changeScript: null }), false)
    t.equal(utils.checkOptions({ changeScript: 'bc1qaddress' }), false)
    t.equal(utils.checkOptions({ changeScript: { length: '34' } }), false)
    t.equal(utils.checkOptions({ changeScript: { length: 0 } }), false)
    t.equal(utils.checkOptions({ changeScript: { length: 1.5 } }), false)
    t.equal(utils.checkOptions({ changeScript: { length: 10000 } }), true)
    t.equal(utils.checkOptions({ changeScript: { length: 10001 } }), false, 'bigger than any valid script')
    t.equal(utils.checkOptions({ txExtraBytes: -1 }), false)
    t.equal(utils.checkOptions({ txExtraBytes: '1' }), false)
  })

  t.end()
})
