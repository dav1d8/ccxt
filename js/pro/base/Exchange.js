"use strict";

const BaseExchange = require ("../../base/Exchange")
    , throttle = require ("../../base/functions").throttle
    , WsClient = require ('./WsClient')
    , {
        OrderBook,
        IndexedOrderBook,
        CountedOrderBook,
    } = require ('./OrderBook')
    , { ExchangeDisabled } = require("./customErrors/errors")
    , functions = require ('./functions');

module.exports = class Exchange extends BaseExchange {
    constructor (options = {}) {
        super (options);
        this.newUpdates = options.newUpdates || true;
    }

    inflate (data) {
        return functions.inflate (data);
    }

    inflate64 (data) {
        return functions.inflate64 (data);
    }

    gunzip (data) {
        return functions.gunzip (data);
    }

    orderBook (snapshot = {}, depth = Number.MAX_SAFE_INTEGER) {
        return new OrderBook (snapshot, depth);
    }

    indexedOrderBook (snapshot = {}, depth = Number.MAX_SAFE_INTEGER) {
        return new IndexedOrderBook (snapshot, depth);
    }

    countedOrderBook (snapshot = {}, depth = Number.MAX_SAFE_INTEGER) {
        return new CountedOrderBook (snapshot, depth);
    }

    client (url) {
        if (this.disabled) {
            throw new ExchangeDisabled("Exchange is already disabled");
        }
        this.clients = this.clients || {};
        if (!this.clients[url]) {
            const onMessage = this.handleMessage.bind (this);
            const onError = this.onError.bind (this);
            const onClose = this.onClose.bind (this);
            const onConnected = this.onConnected.bind (this);
            // decide client type here: ws / signalr / socketio
            const wsOptions = this.safeValue (this.options, 'ws', {});
            let agent;
            if (this.agent) {
                agent = this.agent;
            } else if (this.httpAgent && url.indexOf ('ws://') === 0) {
                agent = this.httpAgent;
            } else if (this.httpsAgent && url.indexOf ('wss://') === 0) {
                agent = this.httpsAgent;
            }
            const options = this.deepExtend (this.streaming, {
                'log': this.log ? this.log.bind (this) : this.log,
                'ping': this.ping ? this.ping.bind (this) : this.ping,
                'verbose': this.verbose,
                'throttle': throttle (this.tokenBucket),
                // add support for proxies
                'options': {
                    'agent': agent,
                    'perMessageDeflate': false,
                }
                //'connectionTimeout': 10000,
            }, wsOptions);
            this.clients[url] = new WsClient (url, onMessage, onError, onClose, onConnected, options);
        }
        return this.clients[url];
    }

    spawn (method, ... args) {
        (method.apply (this, args)).catch ((e) => {
            // todo: handle spawned errors
        })
    }

    delay (timeout, method, ... args) {
        setTimeout (() => {
            this.spawn (method, ... args)
        }, timeout);
    }

    watch (url, messageHash, message = undefined, subscribeHash = undefined, subscription = undefined) {
        //
        // Without comments the code of this method is short and easy:
        //
        //     const client = this.client (url)
        //     const backoffDelay = 0
        //     const future = client.future (messageHash)
        //     const connected = client.connect (backoffDelay)
        //     connected.then (() => {
        //         if (message && !client.subscriptions[subscribeHash]) {
        //             client.subscriptions[subscribeHash] = true
        //             client.send (message)
        //         }
        //     }).catch ((error) => {})
        //     return future
        //
        // The following is a longer version of this method with comments
        //
        if (typeof this.wsProxy === 'function') {
            url = this.wsProxy (url)
        } else if (typeof this.wsProxy === 'string') {
            url = this.wsProxy + url
        }
        const client = this.client (url);
        const backoffDelay = this.nextBackoffDelay !== undefined ? this.nextBackoffDelay : 0;
        //
        //  watchOrderBook ---- future ----+---------------+----→ user
        //                                 |               |
        //                                 ↓               ↑
        //                                 |               |
        //                              connect ......→ resolve
        //                                 |               |
        //                                 ↓               ↑
        //                                 |               |
        //                             subscribe -----→ receive
        //
        const future = client.future (messageHash, subscription.callback);
        // we intentionally do not use await here to avoid unhandled exceptions
        // the policy is to make sure that 100% of promises are resolved or rejected
        // either with a call to client.resolve or client.reject with
        //  a proper exception class instance
        const connected = client.connect (backoffDelay);
        // handle backoffDelay
        connected.then (() => {
            this.nextBackoffDelay = 0;
        }).catch ((error) => {
            this.nextBackoffDelay = backoffDelay === 0 ? 2000 : backoffDelay * 2;
        });
        // the following is executed only if the catch-clause does not
        // catch any connection-level exceptions from the client
        // (connection established successfully)
        connected.then (() => {
            if (!client.subscriptions[subscribeHash]) {
                client.subscriptions[subscribeHash] = subscription || true;
                const options = this.safeValue (this.options, 'ws');
                const cost = this.safeValue (options, 'cost', 1);
                if (message) {
                    if (this.enableRateLimit && client.throttle) {
                        // add cost here |
                        //               |
                        //               V
                        if (this.messageQueue === undefined) {
                            this.messageQueue = [];
                        }
                        this.messageQueue.push(message);
                        client.throttle (cost).then (() => {
                            client.send (message);
                            this.messageQueue = this.messageQueue.filter((_message) => message !== _message);
                        }).catch ((e) => { throw e });
                    } else {
                        client.send (message);
                    }
                }
            }
        })
        return future;
    }

    onConnected (client, message = undefined) {
        // for user hooks
        // console.log ('Connected to', client.url)
    }

    onError (client, error) {
        //if ((client.url in this.clients) && (this.clients[client.url].error)) {
        //    delete this.clients[client.url];
        //}
        //if (this.clients[client.url] === client && (this.clients[client.url].error)) {
        //    delete this.clients[client.url];
        //}
        if (!this.disabled) {
            this.disabled = true;
            if (this.onDisabled) {
                this.onDisabled(client.isClientClosed);
            }
        }
    }

    onClose (client, error) {
        //if (client.error) {
        //    // connection closed due to an error, do nothing
        //} else {
        //    // server disconnected a working connection
        //    if (this.clients[client.url]) {
        //        delete this.clients[client.url];
        //    }
        //}
        if (!this.disabled) {
            this.disabled = true;
            if (this.onDisabled) {
                this.onDisabled(client.isClientClosed);
            }
        }
    }

    close () {
        const clients = Object.values (this.clients || {});
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            //delete this.clients[client.url];
            client.close ();
        }
        if (!this.disabled) {
            this.disabled = true;
            if (this.onDisabled) {
                this.onDisabled(true);
            }
        }
    }

    findTimeframe (timeframe, timeframes = undefined) {
        timeframes = timeframes || this.timeframes;
        const keys = Object.keys (timeframes);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (timeframes[key] === timeframe) {
                return key;
            }
        }
        return undefined;
    }
};
