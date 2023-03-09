const BaseOrderBookUpdate = require("./BaseExhange.js").BaseOrderBookUpdate;
let OrderBookUpdateView;

import("structurae").then((data) => {
  const View = data.View;

  const view = new View();

  OrderBookUpdateView = view.create({
    // e: 'depthUpdate',
    // E: 1678286332157,
    // s: 'SOLBUSD',
    // U: 2719411276,
    // u: 2719411277,
    // b: [ [ '18.77000000', '1948.81000000' ] ],
    // a: [ [ '18.79000000', '804.04000000' ] ]

    $id: "OrderBookUpdate",
    type: "object",
    properties: {
      e: { type: "string", maxLength: 32 },
      E: { type: "number" },
      s: { type: "string", maxLength: 32 },
      U: { type: "number" },
      u: { type: "number" },
    },
  });
});

class OrderBookUpdate extends BaseOrderBookUpdate {
  constructor(buf) {
    super(buf, OrderBookUpdateView);
  }

  get e() {
    return this._view.get("e");
  }
  get E() {
    return this._view.get("E");
  }
  get s() {
    return this._view.get("s");
  }
  get U() {
    return this._view.get("U");
  }
  get u() {
    return this._view.get("u");
  }
}

module.exports = { OrderBookUpdate: OrderBookUpdate };
