class BaseOrderBookUpdate {
  #offset1 = 0;
  #offset2 = 0;
  #offset3 = 0;
  #offset4 = 0;

  #lengthBids = 0;
  #lengthAsks = 0;

  _view = null;
  #dataView = null;

  constructor(buf, OrderBookUpdateViewClass) {
    this._view = new OrderBookUpdateViewClass(buf.buffer, buf.byteOffset);
    this.#dataView = new DataView(buf.buffer, buf.byteOffset + OrderBookUpdateViewClass.viewLength);

    this.#lengthBids = this.#dataView.getFloat64(0, true);
    this.#lengthAsks = this.#dataView.getFloat64(8, true);

    this.#offset1 = 16;
    this.#offset2 = this.#offset1 + this.#lengthBids * 8;
    this.#offset3 = this.#offset2 + this.#lengthBids * 8;
    this.#offset4 = this.#offset3 + this.#lengthAsks * 8;
  }

  get bidsLength() {
    return this.#lengthBids;
  }
  get asksLength() {
    return this.#lengthAsks;
  }
  getBid(i, j) {
    if (i >= this.#lengthBids || i < 0) {
      return undefined;
    }
    if (j === 0) {
      return this.#dataView.getFloat64(this.#offset1 + i * 8, true);
    } else if (j === 1) {
      return this.#dataView.getFloat64(this.#offset2 + i * 8, true);
    }
    return undefined;
  }
  getAsk(i, j) {
    if (i >= this.#lengthAsks || i < 0) {
      return undefined;
    }
    if (j === 0) {
      return this.#dataView.getFloat64(this.#offset3 + i * 8, true);
    } else if (j === 1) {
      return this.#dataView.getFloat64(this.#offset4 + i * 8, true);
    }
    return undefined;
  }
}

module.exports = { BaseOrderBookUpdate: BaseOrderBookUpdate };
