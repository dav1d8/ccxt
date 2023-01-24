/* eslint-disable max-classes-per-file */

'use strict';

// ----------------------------------------------------------------------------
//
// Upto 10x faster after initializing memory for the floating point array
// Author: github.com/frosty00
// Email: carlo.revelli@berkeley.edu
//

function bisectLeft(array, x) {
    let low = 0
    let high = array.length - 1
    while (low <= high) {
        const mid = (low + high) >>> 1;
        if (array[mid] - x < 0) low = mid + 1;
        else high = mid - 1;
    }
    return low;
}

const SIZE = 1024
const SEED = new Float64Array (new Array (SIZE).fill (Number.MAX_VALUE))
const SEED2 = new Float64Array (new Array (SIZE).fill (0))

class OrderBookSide {
    constructor (deltas = [], depth = undefined) {
        // a string-keyed dictionary of price levels / ids / indices
        Object.defineProperty (this, 'index', {
            //__proto__: null, // make it invisible
            value: new Float64Array (SEED),
            writable: true,
        })
        // a string-keyed dictionary of sizes
        Object.defineProperty (this, 'index2', {
            //__proto__: null, // make it invisible
            value: new Float64Array (SEED2),
            writable: true,
        })
        Object.defineProperty (this, 'depth', {
            __proto__: null, // make it invisible
            value: depth || Number.MAX_SAFE_INTEGER,
            writable: true,
        })
        // sort upon initiation
        this.length = 0
        for (let i = 0; i < deltas.length; i++) {
            this.storeArray (deltas[i].slice ())  // slice is muy importante
        }
    }

    get prices() {
        return this.index;
    }

    get amounts() {
        return this.index2;
    }

    storeArray (delta) {
        const price = delta[0]
        const size = delta[1]
        const index_price = this.side ? -price : price
        const biggest_index_price = this.index[this.length - 1];
        let index;
        if ((this.length === 0 || index_price > biggest_index_price) && size) {
            index = this.length;
        } else {
            index = bisectLeft (this.index, index_price)
        }
        if (size) {
            if (this.index[index] === index_price) {
                this.index2[index] = size
            } else {
                this.length++
                if (this.index[index] !== Number.MAX_VALUE) {
                    this.index.copyWithin(index + 1, index, this.index.length)
                }
                this.index[index] = index_price;
                if (this.index2[index] !== 0) {
                    this.index2.copyWithin(index + 1, index, this.index2.length)
                }
                this.index2[index] = size
                // in the rare case of very large orderbooks being sent
                if (this.length > this.index.length - 1) {
                    const existing = Array.from (this.index)
                    existing.length = this.length * 2
                    existing.fill (Number.MAX_VALUE, this.index.length)
                    this.index = new Float64Array (existing)
                }
                if (this.length > this.index2.length - 1) {
                    const existing = Array.from(this.index2)
                    existing.length = this.length * 2
                    existing.fill(0, this.index2.length)
                    this.index2 = new Float64Array(existing)
                }
            }
        } else if (this.index[index] === index_price) {
            this.index.copyWithin (index, index + 1, this.index.length)
            this.index[this.length - 1] = Number.MAX_VALUE
            this.index2.copyWithin (index, index + 1, this.index2.length)
            this.index2[this.length - 1] = 0
            this.length--
        }
    }

    // index an incoming delta in the string-price-keyed dictionary
    store (price, size) {
        this.storeArray ([ price, size ])
    }

    // replace stored orders with new values
    limit () {
        if (this.length > this.depth) {
            for (let i = this.depth; i < this.length; i++) {
                this.index[i] = Number.MAX_VALUE
            }
            this.length = this.depth
        }
    }
}

// ----------------------------------------------------------------------------
// overwrites absolute volumes at price levels
// or deletes price levels based on order counts (3rd value in a bidask delta)
// this class stores vector arrays of values indexed by price

class CountedOrderBookSide extends OrderBookSide {
}

// ----------------------------------------------------------------------------
// stores vector arrays indexed by id (3rd value in a bidask delta array)

class IndexedOrderBookSide extends Array  {
    constructor (deltas = [], depth = Number.MAX_SAFE_INTEGER) {
        super (deltas.length)
        // a string-keyed dictionary of price levels / ids / indices
        Object.defineProperty (this, 'hashmap', {
            __proto__: null, // make it invisible
            value: new Map (),
            writable: true,
        })
        Object.defineProperty (this, 'index', {
            __proto__: null, // make it invisible
            value: new Float64Array (SEED),
            writable: true,
        })
        Object.defineProperty (this, 'depth', {
            __proto__: null, // make it invisible
            value: depth || Number.MAX_SAFE_INTEGER,
            writable: true,
        })
        // sort upon initiation
        for (let i = 0; i < deltas.length; i++) {
            this.length = i
            this.storeArray (deltas[i].slice ())  // slice is muy importante
        }
    }

    store (price, size, id) {
        this.storeArray([ price, size, id ])
    }

    storeArray (delta) {
        const price = delta[0]
        const size = delta[1]
        const id = delta[2]
        let index_price
        if (price !== undefined) {
            index_price = this.side ? -price : price
        } else {
            index_price = undefined
        }
        if (size) {
            if (this.hashmap.has (id)) {
                const old_price = this.hashmap.get (id)
                index_price = index_price || old_price
                // in case price is not sent
                delta[0] = Math.abs (index_price)
                if (index_price === old_price) {
                    const index = bisectLeft (this.index, index_price)
                    this.index[index] = index_price
                    this[index] = delta
                    return
                } else {
                    // remove old price from index
                    const old_index = bisectLeft (this.index, old_price)
                    this.index.copyWithin (old_index, old_index + 1, this.index.length)
                    this.index[this.length - 1] = Number.MAX_VALUE
                    this.copyWithin (old_index, old_index + 1, this.length)
                    this.length--
                }
            }
            // insert new price level
            this.hashmap.set (id, index_price)
            const index = bisectLeft (this.index, index_price)
            // insert new price level into index
            this.length++
            this.index.copyWithin (index + 1, index, this.index.length)
            this.index[index] = index_price
            this.copyWithin (index + 1, index, this.length)
            this[index] = delta
            // in the rare case of very large orderbooks being sent
            if (this.length > this.index.length - 1) {
                const existing = Array.from (this.index)
                existing.length = this.length * 2
                existing.fill (Number.MAX_VALUE, this.index.length)
                this.index = new Float64Array (existing)
            }
        } else if (this.hashmap.has (id)) {
            const old_price = this.hashmap.get (id)
            const index = bisectLeft (this.index, old_price)
            this.index.copyWithin (index, index + 1, this.index.length)
            this.index[this.length - 1] = Number.MAX_VALUE
            this.copyWithin (index, index + 1, this.length)
            this.length--
            this.hashmap.delete (id)
        }
    }

    // replace stored orders with new values
    limit () {
        if (this.length > this.depth) {
            for (let i = this.depth; i < this.length; i++) {
                // diff
                this.hashmap.delete (this.index[i])
                this.index[i] = Number.MAX_VALUE
            }
            this.length = this.depth
        }
    }
}

// ----------------------------------------------------------------------------
// a more elegant syntax is possible here, but native inheritance is portable

class Asks extends OrderBookSide { get side () { return false }}
class Bids extends OrderBookSide { get side () { return true }}
class CountedAsks extends CountedOrderBookSide { get side () { return false }}
class CountedBids extends CountedOrderBookSide { get side () { return true }}
class IndexedAsks extends IndexedOrderBookSide { get side () { return false }}
class IndexedBids extends IndexedOrderBookSide { get side () { return true }}

// ----------------------------------------------------------------------------

module.exports = {

    // basic
    Asks,
    Bids,
    OrderBookSide,

    // count-based
    CountedAsks,
    CountedBids,
    CountedOrderBookSide,

    // order-id based
    IndexedAsks,
    IndexedBids,
    IndexedOrderBookSide,

}
