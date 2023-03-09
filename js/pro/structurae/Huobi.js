const BaseOrderBookUpdate = require("./BaseExhange.js").BaseOrderBookUpdate;
let OrderBookUpdateView;

import("structurae").then((data) => {
  const View = data.View;

  const view = new View();

  view.create({
    $id: "OrderBookUpdateDetail",
    type: "object",
    properties: {
      seqNum: { type: "number" },
      prevSeqNum: { type: "number" },
    },
  });

  OrderBookUpdateView = view.create({
    // {
    //   ch: 'market.solusdt.mbp.150',
    //   ts: 1678294472604,
    //   tick: {
    //     seqNum: 13815424690,
    //     prevSeqNum: 13815424675,
    //     bids: [],
    //     asks: []
    //   }
    // }

    $id: "OrderBookUpdate",
    type: "object",
    properties: {
      ch: { type: "string", maxLength: 32 },
      ts: { type: "number" },
      tick: {
        type: "object",
        $ref: "#OrderBookUpdateDetail"
      },
    },
  });
});

class OrderBookUpdate extends BaseOrderBookUpdate {
  constructor(buf) {
    super(buf, OrderBookUpdateView);
  }

  get ch() {
    return this._view.get("ch");
  }
  get ts() {
    return this._view.get("ts");
  }
  get tick() {
    return this._view.get("tick");
  }
}

module.exports = { OrderBookUpdate: OrderBookUpdate };
