# coinselect

[![TRAVIS](https://secure.travis-ci.org/bitcoinjs/coinselect.png)](http://travis-ci.org/bitcoinjs/coinselect)
[![NPM](http://img.shields.io/npm/v/coinselect.svg)](https://www.npmjs.org/package/coinselect)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

An unspent transaction output (UTXO) selection module for bitcoin.

**WARNING:** Value units are in `satoshi`s, **not** Bitcoin.


## Algorithms
Module | Algorithm | Re-orders UTXOs?
-|-|-
`require('coinselect')` | Blackjack, with Accumulative fallback | By Descending Value
`require('coinselect/accumulative')` | Accumulative - accumulates inputs until the target value (+fees) is reached, skipping detrimental inputs | -
`require('coinselect/blackjack')` | Blackjack - accumulates inputs until the target value (+fees) is matched, does not accumulate inputs that go over the target value (within a threshold) | -
`require('coinselect/break')` | Break - breaks the input values into equal denominations of `output` (as provided) | -
`require('coinselect/split')` | Split - splits the input values evenly between all `outputs`, any provided `output` with `.value` remains unchanged | -


**Note:** Each algorithm will add a change output if the `input - output - fee` value difference is over a dust threshold.
This is calculated independently by `utils.finalize`, irrespective of the algorithm chosen, for the purposes of safety.

**Dust:** an output is considered dust when it is not worth more than it costs to spend (`value <= 148 * feeRate`), or when it is below Bitcoin Core dust limit for its type. The latter is calculated the same way as `GetDustThreshold()` does with default `dustrelayfee` of 3 sat/vbyte: 546 sats for P2PKH, 540 for P2SH, 294 for P2WPKH, 330 for P2WSH and P2TR (output type is guessed from `script.length`, output without a script is treated as P2PKH; `script.length` has to be the exact scriptPubKey length - a padded one is not recognized as a witness program and gets the higher non-witness limit). This way a change output that would be rejected by the network as `dust` is never created, its value goes to the fee instead. The same applies to the outputs created by `coinselect/split`. Values of user defined outputs are not checked.

**Options:** every algorithm accepts an optional 4th argument `options`:

- `changeScript`: `{ length: number }`, length of the scriptPubKey change is going to (22 for P2WPKH, 23 for P2SH, 25 for P2PKH, 34 for P2WSH and P2TR). It is used to account for the actual size of the change output and to pick its dust limit. If omitted, P2PKH change is assumed.
- `txExtraBytes`: `number`, bytes of the transaction this library is not aware of. E.g. segwit marker & flag take 0.5 vbyte, so a wallet spending segwit inputs would pass `1`.

Invalid options (wrong types, unknown keys) make algorithms return no solution (`{}`), as silently ignoring them would produce a transaction with a wrong fee.

**Pro-tip:** if you want to send-all inputs to an output address, `coinselect/split` with a partial output (`.address` defined, no `.value`) can be used to send-all, while leaving an appropriate amount for the `fee`. 

## Example

``` javascript
let coinSelect = require('coinselect')
let feeRate = 55 // satoshis per byte
let utxos = [
  ...,
  {
    txId: '...',
    vout: 0,
    ...,
    value: 10000,
    // For use with PSBT:
    // not needed for coinSelect, but will be passed on to inputs later
    nonWitnessUtxo: Buffer.from('...full raw hex of txId tx...', 'hex'),
    // OR
    // if your utxo is a segwit output, you can use witnessUtxo instead
    witnessUtxo: {
      script: Buffer.from('... scriptPubkey hex...', 'hex'),
      value: 10000 // 0.0001 BTC and is the exact same as the value above
    }
  }
]
let targets = [
  ...,
  {
    address: '1EHNa6Q4Jz2uvNExL497mE43ikXhwF6kZm',
    value: 5000
  }
]

// ...
let { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate)

// the accumulated fee is always returned for analysis
console.log(fee)

// .inputs and .outputs will be undefined if no solution was found
if (!inputs || !outputs) return

let psbt = new bitcoin.Psbt()

inputs.forEach(input =>
  psbt.addInput({
    hash: input.txId,
    index: input.vout,
    nonWitnessUtxo: input.nonWitnessUtxo,
    // OR (not both)
    witnessUtxo: input.witnessUtxo,
  })
)
outputs.forEach(output => {
  // watch out, outputs may have been added that you need to provide
  // an output address/script for
  if (!output.address) {
    output.address = wallet.getChangeAddress()
    wallet.nextChangeAddress()
  }

  psbt.addOutput({
    address: output.address,
    value: output.value,
  })
})
```


## License [MIT](LICENSE)
