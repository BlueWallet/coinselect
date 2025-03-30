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

  t.end()
})
