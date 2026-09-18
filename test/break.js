var coinBreak = require('../break')
var fixtures = require('./fixtures/break')
var tape = require('tape')
var utils = require('./_utils')

fixtures.forEach(function (f) {
  tape(f.description, function (t) {
    var finputs = utils.expand(f.inputs)
    var foutputs = utils.expand([f.output])
    var actual = coinBreak(finputs, foutputs[0], f.feeRate)

    t.same(actual, f.expected)
    t.end()
  })
})

tape('break: options', function (t) {
  // 2 outputs of 4000: 10 + 148 + 34 * 2 = 226, + p2tr change 43 = 269, + 1 extra = 270
  var result = coinBreak([{ value: 10000 }], { value: 4000 }, 1, { changeScript: { length: 34 }, txExtraBytes: 1 })
  t.same(result.outputs, [{ value: 4000 }, { value: 4000 }, { value: 10000 - 8000 - 270 }])
  t.equal(result.fee, 270)

  t.same(coinBreak([{ value: 10000 }], { value: 4000 }, 1, { txExtraBytes: 1.5 }), {})

  t.end()
})
