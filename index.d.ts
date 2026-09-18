export interface UTXO {
    txid: string | Buffer,
    vout: number,
    value: number,
    nonWitnessUtxo? : Buffer,
    witnessUtxo? : {
        script: Buffer,
        value: number
    },
    /** size of the script spending this utxo (scriptSig, or witness in vbytes). p2pkh (107 bytes) is assumed if not set */
    script?: ScriptLength
}
export interface Target {
    address: string,
    value?: number,
    /** size of the scriptPubKey of this output. p2pkh (25 bytes) is assumed if not set */
    script?: ScriptLength
}
export interface SelectedUTXO {
    inputs?: UTXO[],
    outputs?: Target[],
    fee: number
}
export interface ScriptLength {
    length: number
}
export interface Options {
    /** length of the scriptPubKey change is going to. Used for the size of change output and its dust limit. p2pkh (25 bytes) is assumed if not set */
    changeScript?: ScriptLength,
    /** bytes of the transaction this library is not aware of, e.g. 1 for segwit marker & flag (0.5 vbyte, rounded up) */
    txExtraBytes?: number
}
/**
 * Selects utxos to fund the outputs, tries to avoid change output first (blackjack), then falls back to accumulative.
 *
 * @param utxos unspent outputs available for spending. `script.length` of utxo, if set, is used as input script size,
 * p2pkh input is assumed otherwise
 * @param outputs where coins are going. `script.length` of output, if set, is used as output script size, p2pkh output
 * is assumed otherwise
 * @param feeRate fee rate in satoshis per (virtual) byte, can be fractional
 * @param options optional, see `Options`. Invalid options (wrong types, unknown keys) give no solution (`{}`) rather
 * than a wrong fee
 * @returns selected `inputs`, `outputs` (change, if any, is the last one and has no address) and `fee`. If no solution
 * was found `inputs` and `outputs` are undefined, and `fee` is the fee that would be needed
 */
export default function coinSelect(utxos: UTXO[], outputs: Target[], feeRate: number, options?: Options): SelectedUTXO;
