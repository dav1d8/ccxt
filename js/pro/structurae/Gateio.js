const BaseOrderBookUpdate = require("./BaseExhange.js").BaseOrderBookUpdate;
let OrderBookUpdateView;

import("structurae").then((data) => {
  const View = data.View;

  const view = new View();

  view.create({
    $id: "OrderBookUpdateDetail",
    type: "object",
    properties: {
      t: { type: "number" },
      e: { type: "string", maxLength: 32 },
      E: { type: "number" },
      s: { type: "string", maxLength: 32 },
      U: { type: "number" },
      u: { type: "number" },
    },
  });

  OrderBookUpdateView = view.create({
    $id: "OrderBookUpdate",
    type: "object",
    properties: {
      time: { type: "number" },
      time_ms: { type: "number" },
      channel: { type: "string", maxLength: 32 },
      event: { type: "string", maxLength: 32 },
      result: { type: "object", $ref: "#OrderBookUpdateDetail" },
    },
  });
});

class OrderBookUpdate extends BaseOrderBookUpdate {
  constructor(buf) {
    super(buf, OrderBookUpdateView);
  }

  get time() {
    return this._view.get("time");
  }
  get time_ms() {
    return this._view.get("time_ms");
  }
  get channel() {
    return this._view.get("channel");
  }
  get event() {
    return this._view.get("event");
  }
  get result() {
    return this._view.get("result");
  }
}

module.exports = { OrderBookUpdate: OrderBookUpdate };
