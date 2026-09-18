// baseline estimates, used to improve performance
var TX_EMPTY_SIZE = 4 + 1 + 1 + 4
var TX_INPUT_BASE = 32 + 4 + 1 + 4
var TX_INPUT_PUBKEYHASH = 107
var TX_OUTPUT_BASE = 8 + 1
var TX_OUTPUT_PUBKEYHASH = 25

function inputBytes (input) {
  return TX_INPUT_BASE + (input.script ? input.script.length : TX_INPUT_PUBKEYHASH)
}

function outputBytes (output) {
  return TX_OUTPUT_BASE + (output.script ? output.script.length : TX_OUTPUT_PUBKEYHASH)
}

// default `dustrelayfee` of Bitcoin Core, sat/vbyte
var DUST_RELAY_FEE_RATE = 3

// size of the input spending the output, as Bitcoin Core assumes it when calculating dust
var DUST_INPUT_SIZE = 32 + 4 + 1 + 107 + 4
var DUST_WITNESS_INPUT_SIZE = 32 + 4 + 1 + Math.floor(107 / 4) + 4

// witness programs we know of: p2wpkh (22 bytes), p2wsh & p2tr (34 bytes)
function isWitnessScriptLength (length) {
  return length === 22 || length === 34
}

// minimal value of the output that is relayed by nodes with default policy, see GetDustThreshold() in Bitcoin Core.
// output without a script is treated as p2pkh
function relayDustThreshold (output) {
  var inputSize = output.script && isWitnessScriptLength(output.script.length) ? DUST_WITNESS_INPUT_SIZE : DUST_INPUT_SIZE
  return (outputBytes(output) + inputSize) * DUST_RELAY_FEE_RATE
}

function dustThreshold (output, feeRate) {
  return Math.max(inputBytes({}) * feeRate, relayDustThreshold(output))
}

// output should be worth more than it costs to spend it on current fee rate, and it should not be rejected by the network
// as dust. Bitcoin Core relays outputs with the value equal to its dust threshold, so that check is inclusive
function isDust (value, output, feeRate) {
  return !(value > inputBytes({}) * feeRate && value >= relayDustThreshold(output))
}

// options are optional:
//   changeScript: { length: number } - scriptPubKey change is going to, p2pkh is assumed by default
//   txExtraBytes: number - bytes of the transaction this library is not aware of (e.g. segwit marker & flag)
// invalid options make algorithms return no solution, as silently ignoring them would produce a wrong fee
var KNOWN_OPTIONS = ['changeScript', 'txExtraBytes']
// same as in Bitcoin Core. an absurdly big change script would make change unaffordable and silently turn it into fee
var MAX_SCRIPT_SIZE = 10000

function checkOptions (options) {
  if (options === undefined) return true
  if (typeof options !== 'object' || options === null) return false
  if (!Object.keys(options).every(function (k) { return KNOWN_OPTIONS.indexOf(k) !== -1 })) return false

  if (options.changeScript !== undefined) {
    var script = options.changeScript
    if (typeof script !== 'object' || script === null) return false
    if (!(uintOrNaN(script.length) > 0) || script.length > MAX_SCRIPT_SIZE) return false
  }

  if (options.txExtraBytes !== undefined && !isFinite(uintOrNaN(options.txExtraBytes))) return false

  return true
}

function transactionBytes (inputs, outputs, options) {
  // invalid options should never end up as a plausible looking size
  if (!checkOptions(options)) return NaN

  return TX_EMPTY_SIZE +
    ((options && options.txExtraBytes) || 0) +
    inputs.reduce(function (a, x) { return a + inputBytes(x) }, 0) +
    outputs.reduce(function (a, x) { return a + outputBytes(x) }, 0)
}

function uintOrNaN (v) {
  if (typeof v !== 'number') return NaN
  if (!isFinite(v)) return NaN
  if (Math.floor(v) !== v) return NaN
  if (v < 0) return NaN
  return v
}

function positiveNumOrNaN (v) {
  if (typeof v !== 'number') return NaN
  if (!isFinite(v)) return NaN
  if (v < 0) return NaN
  return v
}

function sumForgiving (range) {
  return range.reduce(function (a, x) { return a + (isFinite(x.value) ? x.value : 0) }, 0)
}

function sumOrNaN (range) {
  return range.reduce(function (a, x) { return a + uintOrNaN(x.value) }, 0)
}

function finalize (inputs, outputs, feeRate, options) {
  if (!checkOptions(options)) return {}

  var change = options && options.changeScript ? { script: options.changeScript } : {}
  var bytesAccum = transactionBytes(inputs, outputs, options)
  var feeAfterExtraOutput = Math.round(feeRate * (bytesAccum + outputBytes(change)))
  var remainderAfterExtraOutput = sumOrNaN(inputs) - (sumOrNaN(outputs) + feeAfterExtraOutput)

  // is it worth a change output?
  if (!isDust(remainderAfterExtraOutput, change, feeRate)) {
    outputs = outputs.concat({ value: remainderAfterExtraOutput })
  }

  var fee = sumOrNaN(inputs) - sumOrNaN(outputs)
  if (!isFinite(fee)) return { fee: feeRate * bytesAccum }

  return {
    inputs: inputs,
    outputs: outputs,
    fee: fee
  }
}

module.exports = {
  checkOptions: checkOptions,
  dustThreshold: dustThreshold,
  finalize: finalize,
  inputBytes: inputBytes,
  isDust: isDust,
  outputBytes: outputBytes,
  sumOrNaN: sumOrNaN,
  sumForgiving: sumForgiving,
  transactionBytes: transactionBytes,
  uintOrNaN: uintOrNaN,
  positiveNumOrNaN: positiveNumOrNaN
}
