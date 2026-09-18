var coinSplit = require('../split')
var fixtures = require('./fixtures/split')
var tape = require('tape')
var utils = require('./_utils')

fixtures.forEach(function (f) {
  tape(f.description, function (t) {
    var finputs = utils.expand(f.inputs)
    var foutputs = f.outputs.concat()
    var actual = coinSplit(finputs, foutputs, f.feeRate)

    t.same(actual, f.expected)
    if (actual.inputs) {
      var feedback = coinSplit(finputs, actual.outputs, f.feeRate)
      t.same(feedback, f.expected)
    }

    t.end()
  })
})

tape('split does not create outputs below dust limit of their type', function (t) {
  // tx is 10 + 148 + 31 = 189 bytes
  var p2wpkh = { script: { length: 22 } }
  t.same(coinSplit([{ value: 189 + 294 }], [p2wpkh], 1).outputs, [{ script: { length: 22 }, value: 294 }])
  t.equal(coinSplit([{ value: 189 + 293 }], [p2wpkh], 1).outputs, undefined)

  // tx is 10 + 148 + 43 = 201 bytes
  var p2tr = { script: { length: 34 } }
  t.same(coinSplit([{ value: 201 + 330 }], [p2tr], 1).outputs, [{ script: { length: 34 }, value: 330 }])
  t.equal(coinSplit([{ value: 201 + 329 }], [p2tr], 1).outputs, undefined)

  // tx is 10 + 148 + 34 = 192 bytes
  t.same(coinSplit([{ value: 192 + 546 }], [{}], 1).outputs, [{ value: 546 }])
  t.equal(coinSplit([{ value: 192 + 545 }], [{}], 1).outputs, undefined)

  t.end()
})

tape('split: options', function (t) {
  // 1 sat/vB, tx is 192 bytes + 1 extra
  t.same(coinSplit([{ value: 10000 }], [{}], 1, { txExtraBytes: 1 }), { inputs: [{ value: 10000 }], outputs: [{ value: 10000 - 193 }], fee: 193 })

  // user defined output + change to p2wpkh: 10 + 148 + 34 + 31 = 223 bytes
  var result = coinSplit([{ value: 10000 }], [{ value: 5000 }], 1, { changeScript: { length: 22 } })
  t.same(result.outputs, [{ value: 5000 }, { value: 10000 - 5000 - 223 }])
  t.equal(result.fee, 223)

  t.same(coinSplit([{ value: 10000 }], [{}], 1, { changeScript: {} }), {})

  t.end()
})
