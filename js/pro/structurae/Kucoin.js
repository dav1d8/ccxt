const BaseOrderBookUpdate = require("./BaseExhange.js").BaseOrderBookUpdate;
let OrderBookUpdateView;

import("structurae").then((data) => {
  const View = data.View;

  const view = new View();

  view.create({
    $id: "OrderBookUpdateDetail",
    type: "object",
    properties: {
      timestamp: { type: "number" },
    },
  });

  OrderBookUpdateView = view.create({
    // {
    //   type: "message",
    //   topic: "/spotMarket/level2Depth50:SOL-USDC",
    //   subject: "level2",
    //   data: {
    //     asks: [["18.43", "39.6296"]],
    //     bids: [["18.42", "75.5668"]],
    //     timestamp: 1678354648993,
    //   },
    // }

    $id: "OrderBookUpdate",
    type: "object",
    properties: {
      type: { type: "string", maxLength: 32 },
      topic: { type: "string", maxLength: 64 },
      subject: { type: "string", maxLength: 32 },
      data: {
        type: "object",
        $ref: "#OrderBookUpdateDetail",
      },
    },
  });
});

class OrderBookUpdate extends BaseOrderBookUpdate {
  constructor(buf) {
    super(buf, OrderBookUpdateView);
  }

  get type() {
    return this._view.get("type");
  }
  get topic() {
    return this._view.get("topic");
  }
  get subject() {
    return this._view.get("subject");
  }
  get data() {
    return this._view.get("data");
  }
}

module.exports = { OrderBookUpdate: OrderBookUpdate };
