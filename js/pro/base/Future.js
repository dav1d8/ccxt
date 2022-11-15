'use strict'

Promise.prototype.resolve = function() {
    // eslint-disable-next-line prefer-rest-params
    if (this._resolve) {
        this._resolve.apply(this, arguments)
    }
}

Promise.prototype.reject = function() {
    // eslint-disable-next-line prefer-rest-params
    if (this._reject) {
        this._reject.apply(this, arguments)
    }
}

module.exports = function Future () {

    let resolve = undefined
        , reject = undefined

    const p = new Promise ((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    })

    p._resolve = resolve;
    p._reject = reject;

    return p;
}
