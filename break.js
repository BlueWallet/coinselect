var utils = require('./utils')

// break utxos into the maximum number of 'output' possible
module.exports = function broken (utxos, output, feeRate, options) {
  if (!isFinite(utils.positiveNumOrNaN(feeRate))) return {}
  if (!utils.checkOptions(options)) return {}

  var bytesAccum = utils.transactionBytes(utxos, [], options)
  var value = utils.uintOrNaN(output.value)
  var inAccum = utils.sumOrNaN(utxos)
  if (!isFinite(value) ||
      !isFinite(inAccum)) return { fee: feeRate * bytesAccum }

  var outputBytes = utils.outputBytes(output)
  var outAccum = 0
  var outputs = []

  while (true) {
    var fee = feeRate * (bytesAccum + outputBytes)

    // did we bust?
    if (inAccum < (outAccum + fee + value)) {
      // premature?
      if (outAccum === 0) return { fee: fee }

      break
    }

    bytesAccum += outputBytes
    outAccum += value
    outputs.push(output)
  }

  return utils.finalize(utxos, outputs, feeRate, options)
}
