var utils = require('./utils')

// only add inputs if they don't bust the target value (aka, exact match)
// worst-case: O(n)
module.exports = function blackjack (utxos, outputs, feeRate, options) {
  if (!isFinite(utils.positiveNumOrNaN(feeRate))) return {}
  if (!utils.checkOptions(options)) return {}

  var bytesAccum = utils.transactionBytes([], outputs, options)

  var inAccum = 0
  var inputs = []
  var outAccum = utils.sumOrNaN(outputs)
  // how much we are fine to overpay to avoid a change output. this is intentionally not the dust threshold: that one can be
  // way bigger on low fee rates, and a solution with change would be cheaper
  var threshold = utils.inputBytes({}) * feeRate

  for (var i = 0; i < utxos.length; ++i) {
    var input = utxos[i]
    var inputBytes = utils.inputBytes(input)
    var fee = feeRate * (bytesAccum + inputBytes)
    var inputValue = utils.uintOrNaN(input.value)

    // would it waste value?
    if ((inAccum + inputValue) > (outAccum + fee + threshold)) continue

    bytesAccum += inputBytes
    inAccum += inputValue
    inputs.push(input)

    // go again?
    if (inAccum < outAccum + fee) continue

    return utils.finalize(inputs, outputs, feeRate, options)
  }

  return { fee: feeRate * bytesAccum }
}
