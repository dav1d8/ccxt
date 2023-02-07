'use strict'

/*  ------------------------------------------------------------------------

    NB: initially, I used objects for options passing:

            decimalToPrecision ('123.456', { digits: 2, round: true, afterPoint: true })

    ...but it turns out it's hard to port that across different languages and it is also
       probably has a performance penalty -- while it's a performance critical code! So
       I switched to using named constants instead, as it is actually more readable and
       succinct, and surely doesn't come with any inherent performance downside:

            decimalToPrecision ('123.456', ROUND, 2, DECIMAL_PLACES)                     */

const BigNumber = require('bignumber.js');
const Precise = require("../Precise");
BigNumber.config({ EXPONENTIAL_AT: 1e+9 })

const ROUND      = 0                // rounding mode
    , TRUNCATE   = 1
    , ROUND_UP   = 2
    , ROUND_DOWN = 3

const DECIMAL_PLACES     = 0        // digits counting mode
    , SIGNIFICANT_DIGITS = 1
    , TICK_SIZE = 2

const NO_PADDING    = 0             // zero-padding mode
    , PAD_WITH_ZERO = 1

const precisionConstants = {
    ROUND,
    TRUNCATE,
    ROUND_UP,
    ROUND_DOWN,
    DECIMAL_PLACES,
    SIGNIFICANT_DIGITS,
    TICK_SIZE,
    NO_PADDING,
    PAD_WITH_ZERO,
}

/*  ------------------------------------------------------------------------ */

// See https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript for discussion

function numberToString (x) { // avoids scientific notation for too large and too small numbers
    if (x === undefined) return undefined

    if (typeof x !== 'number') return x.toString ()

    const s = x.toString ()
    if (Math.abs (x) < 1.0) {
        const n_e = s.split ('e-')
        const n = n_e[0].replace ('.', '')
        const e = parseInt (n_e[1])
        const neg = (s[0] === '-')
        if (e) {
            x = (neg ? '-' : '') + '0.' + (new Array (e)).join ('0') + n.substring (neg)
            return x
        }
    } else {
        const parts = s.split ('e')
        if (parts[1]) {
            let e = parseInt (parts[1])
            const m = parts[0].split ('.')
            let part = ''
            if (m[1]) {
                e -= m[1].length
                part = m[1]
            }
            return m[0] + part + (new Array (e + 1)).join ('0')
        }
    }
    return s
}

//-----------------------------------------------------------------------------
// expects non-scientific notation

const truncate_regExpCache = []
    , truncate_to_string = (num, precision = 0) => {
        num = numberToString (num)
        if (precision > 0) {
            const re = truncate_regExpCache[precision] || (truncate_regExpCache[precision] = new RegExp ("([-]*\\d+\\.\\d{" + precision + "})(\\d)"))
            const [ , result] = num.toString ().match (re) || [null, num]
            return result.toString ()
        }
        return parseInt (num).toString ()
    }
    , truncate = (num, precision = 0) => parseFloat (truncate_to_string (num, precision))

function precisionFromString (string) {
    const split = string.replace (/0+$/g, '').split ('.')
    return (split.length > 1) ? (split[1].length) : 0
}

/*  ------------------------------------------------------------------------ */

const decimalToPrecisionBigNumber = (x, roundingMode
  , numPrecisionDigits
  , countingMode       = DECIMAL_PLACES) => {

    if (countingMode === TICK_SIZE) {
        if (numPrecisionDigits <= 0) {
            throw new Error ('TICK_SIZE cant be used with negative or zero numPrecisionDigits')
        }
    }
    if (countingMode === SIGNIFICANT_DIGITS) {
        if (numPrecisionDigits < 0) {
            throw new Error ('SIGNIFICANT_DIGITS cant be used with negative numPrecisionDigits')
        }
    }
    if (countingMode === DECIMAL_PLACES ) {
        if (numPrecisionDigits < 0) {
            throw new Error ('DECIMAL_PLACES cant be used with negative numPrecisionDigits')
        }
    }

    const bigRoundingMode =
      roundingMode === ROUND ? BigNumber.ROUND_HALF_UP :
        roundingMode === ROUND_UP ? BigNumber.ROUND_CEIL : //This is intentional
          roundingMode === TRUNCATE ? BigNumber.ROUND_DOWN : undefined;
    if (bigRoundingMode === undefined) {
        throw new Error("roundingMode is not supported: " + roundingMode);
    }

    let number = BigNumber(x);
    if (countingMode === DECIMAL_PLACES) {
        return number.decimalPlaces(numPrecisionDigits, bigRoundingMode);
    } else if (countingMode === TICK_SIZE) {
        return number
          .dividedBy(numPrecisionDigits)
          .decimalPlaces(0, bigRoundingMode)
          .multipliedBy(numPrecisionDigits);
    } else if (countingMode === SIGNIFICANT_DIGITS) {
        if (numPrecisionDigits === 0) {
            return BigNumber(0);
        } else {
            return number.precision(numPrecisionDigits, bigRoundingMode);
        }
    } else {
        throw new Error("precisionMode is not supported: " + this.precisionMode);
    }
  }

const decimalToPrecision = (x, roundingMode
                             , numPrecisionDigits
                             , countingMode       = DECIMAL_PLACES
                             , paddingMode        = NO_PADDING) => {

    const number = decimalToPrecisionBigNumber(x, roundingMode, numPrecisionDigits, countingMode);

    if (countingMode === DECIMAL_PLACES) {
        if (paddingMode === PAD_WITH_ZERO) {
            return number.toFixed(numPrecisionDigits);
        }
        return number.toString();
    } else if (countingMode === TICK_SIZE) {
        if (paddingMode === PAD_WITH_ZERO) {
            const precision = precisionFromString(numPrecisionDigits.toString());
            return number.toFixed(precision);
        }
        return number.toString();
    } else if (countingMode === SIGNIFICANT_DIGITS) {
        if (paddingMode === PAD_WITH_ZERO) {
            const precise = new Precise(number.toString());
            let precision = numPrecisionDigits - precise.integer.toString().length + precise.decimals;
            precision = Math.max(precision, 0);
            return number.toFixed(precision);
        }
        return number.toString();
    } else {
        throw new Error("precisionMode is not supported: " + this.precisionMode);
    }
}

function omitZero (stringNumber) {
    if (stringNumber === undefined || stringNumber === '') {
        return undefined
    }
    if (parseFloat (stringNumber) === 0) {
        return undefined
    }
    return stringNumber
}

/*  ------------------------------------------------------------------------ */

module.exports = {
    numberToString,
    precisionFromString,
    decimalToPrecision,
    decimalToPrecisionBigNumber,
    truncate_to_string,
    truncate,
    omitZero,
    precisionConstants,
    ROUND,
    TRUNCATE,
    ROUND_UP,
    ROUND_DOWN,
    DECIMAL_PLACES,
    SIGNIFICANT_DIGITS,
    TICK_SIZE,
    NO_PADDING,
    PAD_WITH_ZERO,
}

/*  ------------------------------------------------------------------------ */
