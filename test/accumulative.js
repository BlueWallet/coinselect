var coinAccum = require('../accumulative')
var fixtures = require('./fixtures/accumulative')
var tape = require('tape')
var utils = require('./_utils')

fixtures.forEach(function (f) {
  tape(f.description, function (t) {
    var inputs = utils.expand(f.inputs, true)
    var outputs = utils.expand(f.outputs)
    var actual = coinAccum(inputs, outputs, f.feeRate)

    t.same(actual, f.expected)
    if (actual.inputs) {
      var feedback = coinAccum(actual.inputs, actual.outputs, f.feeRate)
      t.same(feedback, f.expected)
    }

    t.end()
  })
})

tape('accumulative: sub-dust remainder goes to fee, it does not add another input to get change', function (t) {
  // 10700 covers 10000 + 192 fee, remainder of 508 is below p2pkh dust limit (546) so it can not be a change
  var result = coinAccum([{ value: 10700 }, { value: 2000 }], [{ value: 10000 }], 1)
  t.same(result.inputs, [{ value: 10700 }])
  t.same(result.outputs, [{ value: 10000 }])
  t.equal(result.fee, 700)

  t.end()
})
