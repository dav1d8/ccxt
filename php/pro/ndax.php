<?php

namespace ccxt\pro;

// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

use Exception; // a common import
use React\Async;

class ndax extends \ccxt\async\ndax {

    use ClientTrait;

    public function describe() {
        return $this->deep_extend(parent::describe(), array(
            'has' => array(
                'ws' => true,
                'watchOrderBook' => true,
                'watchTrades' => true,
                'watchTicker' => true,
                'watchOHLCV' => true,
            ),
            'urls' => array(
                'test' => array(
                    'ws' => 'wss://ndaxmarginstaging.cdnhop.net:10456/WSAdminGatewa/',
                ),
                'api' => array(
                    'ws' => 'wss://api.ndax.io/WSGateway',
                ),
            ),
            // 'options' => array(
            //     'tradesLimit' => 1000,
            //     'ordersLimit' => 1000,
            //     'OHLCVLimit' => 1000,
            // ),
        ));
    }

    public function request_id() {
        $requestId = $this->sum($this->safe_integer($this->options, 'requestId', 0), 1);
        $this->options['requestId'] = $requestId;
        return $requestId;
    }

    public function watch_ticker($symbol, $params = array ()) {
        return Async\async(function () use ($symbol, $params) {
            $omsId = $this->safe_integer($this->options, 'omsId', 1);
            Async\await($this->load_markets());
            $market = $this->market($symbol);
            $name = 'SubscribeLevel1';
            $messageHash = $name . ':' . $market['id'];
            $url = $this->urls['api']['ws'];
            $requestId = $this->request_id();
            $payload = array(
                'OMSId' => $omsId,
                'InstrumentId' => intval($market['id']), // conditionally optional
                // 'Symbol' => $market['info']['symbol'], // conditionally optional
            );
            $request = array(
                'm' => 0, // $message type, 0 $request, 1 reply, 2 subscribe, 3 event, unsubscribe, 5 error
                'i' => $requestId, // sequence number identifies an individual $request or $request-and-response pair, to your application
                'n' => $name, // function $name is the $name of the function being called or that the server is responding to, the server echoes your call
                'o' => $this->json($payload), // JSON-formatted string containing the data being sent with the $message
            );
            $message = array_merge($request, $params);
            return Async\await($this->watch($url, $messageHash, $message, $messageHash));
        }) ();
    }

    public function handle_ticker($client, $message) {
        $payload = $this->safe_value($message, 'o', array());
        //
        //     {
        //         "OMSId" => 1,
        //         "InstrumentId" => 1,
        //         "BestBid" => 6423.57,
        //         "BestOffer" => 6436.53,
        //         "LastTradedPx" => 6423.57,
        //         "LastTradedQty" => 0.96183964,
        //         "LastTradeTime" => 1534862990343,
        //         "SessionOpen" => 6249.64,
        //         "SessionHigh" => 11111,
        //         "SessionLow" => 4433,
        //         "SessionClose" => 6249.64,
        //         "Volume" => 0.96183964,
        //         "CurrentDayVolume" => 3516.31668185,
        //         "CurrentDayNumTrades" => 8529,
        //         "CurrentDayPxChange" => 173.93,
        //         "CurrentNotional" => 0.0,
        //         "Rolling24HrNotional" => 0.0,
        //         "Rolling24HrVolume" => 4319.63870783,
        //         "Rolling24NumTrades" => 10585,
        //         "Rolling24HrPxChange" => -0.4165607307408487,
        //         "TimeStamp" => "1534862990358"
        //     }
        //
        $ticker = $this->parse_ticker($payload);
        $symbol = $ticker['symbol'];
        $market = $this->market($symbol);
        $this->tickers[$symbol] = $ticker;
        $name = 'SubscribeLevel1';
        $messageHash = $name . ':' . $market['id'];
        $client->resolve ($ticker, $messageHash);
    }

    public function watch_trades($symbol, $since = null, $limit = null, $params = array ()) {
        return Async\async(function () use ($symbol, $since, $limit, $params) {
            $omsId = $this->safe_integer($this->options, 'omsId', 1);
            Async\await($this->load_markets());
            $market = $this->market($symbol);
            $symbol = $market['symbol'];
            $name = 'SubscribeTrades';
            $messageHash = $name . ':' . $market['id'];
            $url = $this->urls['api']['ws'];
            $requestId = $this->request_id();
            $payload = array(
                'OMSId' => $omsId,
                'InstrumentId' => intval($market['id']), // conditionally optional
                'IncludeLastCount' => 100, // the number of previous $trades to retrieve in the immediate snapshot, 100 by default
            );
            $request = array(
                'm' => 0, // $message type, 0 $request, 1 reply, 2 subscribe, 3 event, unsubscribe, 5 error
                'i' => $requestId, // sequence number identifies an individual $request or $request-and-response pair, to your application
                'n' => $name, // function $name is the $name of the function being called or that the server is responding to, the server echoes your call
                'o' => $this->json($payload), // JSON-formatted string containing the data being sent with the $message
            );
            $message = array_merge($request, $params);
            $trades = Async\await($this->watch($url, $messageHash, $message, $messageHash));
            if ($this->newUpdates) {
                $limit = $trades->getLimit ($symbol, $limit);
            }
            return $this->filter_by_since_limit($trades, $since, $limit, 'timestamp', true);
        }) ();
    }

    public function handle_trades($client, $message) {
        $payload = $this->safe_value($message, 'o', array());
        //
        // initial snapshot
        //
        //     array(
        //         array(
        //             6913253,       //  0 TradeId
        //             8,             //  1 ProductPairCode
        //             0.03340802,    //  2 Quantity
        //             19116.08,      //  3 Price
        //             2543425077,    //  4 Order1
        //             2543425482,    //  5 Order2
        //             1606935922416, //  6 Tradetime
        //             0,             //  7 Direction
        //             1,             //  8 TakerSide
        //             0,             //  9 BlockTrade
        //             0,             // 10 Either Order1ClientId or Order2ClientId
        //         )
        //     )
        //
        $name = 'SubscribeTrades';
        $updates = array();
        for ($i = 0; $i < count($payload); $i++) {
            $trade = $this->parse_trade($payload[$i]);
            $symbol = $trade['symbol'];
            $tradesArray = $this->safe_value($this->trades, $symbol);
            if ($tradesArray === null) {
                $limit = $this->safe_integer($this->options, 'tradesLimit', 1000);
                $tradesArray = new ArrayCache ($limit);
            }
            $tradesArray->append ($trade);
            $this->trades[$symbol] = $tradesArray;
            $updates[$symbol] = true;
        }
        $symbols = is_array($updates) ? array_keys($updates) : array();
        for ($i = 0; $i < count($symbols); $i++) {
            $symbol = $symbols[$i];
            $market = $this->market($symbol);
            $messageHash = $name . ':' . $market['id'];
            $tradesArray = $this->safe_value($this->trades, $symbol);
            $client->resolve ($tradesArray, $messageHash);
        }
    }

    public function watch_ohlcv($symbol, $timeframe = '1m', $since = null, $limit = null, $params = array ()) {
        return Async\async(function () use ($symbol, $timeframe, $since, $limit, $params) {
            $omsId = $this->safe_integer($this->options, 'omsId', 1);
            Async\await($this->load_markets());
            $market = $this->market($symbol);
            $symbol = $market['symbol'];
            $name = 'SubscribeTicker';
            $messageHash = $name . ':' . $timeframe . ':' . $market['id'];
            $url = $this->urls['api']['ws'];
            $requestId = $this->request_id();
            $payload = array(
                'OMSId' => $omsId,
                'InstrumentId' => intval($market['id']), // conditionally optional
                'Interval' => intval($this->timeframes[$timeframe]),
                'IncludeLastCount' => 100, // the number of previous candles to retrieve in the immediate snapshot, 100 by default
            );
            $request = array(
                'm' => 0, // $message type, 0 $request, 1 reply, 2 subscribe, 3 event, unsubscribe, 5 error
                'i' => $requestId, // sequence number identifies an individual $request or $request-and-response pair, to your application
                'n' => $name, // function $name is the $name of the function being called or that the server is responding to, the server echoes your call
                'o' => $this->json($payload), // JSON-formatted string containing the data being sent with the $message
            );
            $message = array_merge($request, $params);
            $ohlcv = Async\await($this->watch($url, $messageHash, $message, $messageHash));
            if ($this->newUpdates) {
                $limit = $ohlcv->getLimit ($symbol, $limit);
            }
            return $this->filter_by_since_limit($ohlcv, $since, $limit, 0, true);
        }) ();
    }

    public function handle_ohlcv($client, $message) {
        //
        //     {
        //         m => 1,
        //         $i => 1,
        //         n => 'SubscribeTicker',
        //         o => [[1608284160000,23113.52,23070.88,23075.76,23075.39,162.44964300,23075.38,23075.39,8,1608284100000]],
        //     }
        //
        $payload = $this->safe_value($message, 'o', array());
        //
        //     array(
        //         array(
        //             1501603632000,      // 0 DateTime
        //             2700.33,            // 1 High
        //             2687.01,            // 2 Low
        //             2687.01,            // 3 Open
        //             2687.01,            // 4 Close
        //             24.86100992,        // 5 Volume
        //             0,                  // 6 Inside Bid Price
        //             2870.95,            // 7 Inside Ask Price
        //             1                   // 8 InstrumentId
        //             1608290188062.7678, // 9 candle $timestamp
        //         )
        //     )
        //
        $updates = array();
        for ($i = 0; $i < count($payload); $i++) {
            $ohlcv = $payload[$i];
            $marketId = $this->safe_string($ohlcv, 8);
            $market = $this->safe_market($marketId);
            $symbol = $market['symbol'];
            $updates[$marketId] = array();
            $this->ohlcvs[$symbol] = $this->safe_value($this->ohlcvs, $symbol, array());
            $keys = is_array($this->timeframes) ? array_keys($this->timeframes) : array();
            for ($j = 0; $j < count($keys); $j++) {
                $timeframe = $keys[$j];
                $interval = $this->timeframes[$timeframe];
                $duration = intval($interval) * 1000;
                $timestamp = $this->safe_integer($ohlcv, 0);
                $parsed = array(
                    intval($timestamp / $duration) * $duration,
                    $this->safe_float($ohlcv, 3),
                    $this->safe_float($ohlcv, 1),
                    $this->safe_float($ohlcv, 2),
                    $this->safe_float($ohlcv, 4),
                    $this->safe_float($ohlcv, 5),
                );
                $stored = $this->safe_value($this->ohlcvs[$symbol], $timeframe, array());
                $length = count($stored);
                if ($length && ($parsed[0] === $stored[$length - 1][0])) {
                    $previous = $stored[$length - 1];
                    $stored[$length - 1] = [
                        $parsed[0],
                        $previous[1],
                        max ($parsed[1], $previous[1]),
                        min ($parsed[2], $previous[2]),
                        $parsed[4],
                        $this->sum($parsed[5], $previous[5]),
                    ];
                    $updates[$marketId][$timeframe] = true;
                } else {
                    if ($length && ($parsed[0] < $stored[$length - 1][0])) {
                        continue;
                    } else {
                        $stored[] = $parsed;
                        $limit = $this->safe_integer($this->options, 'OHLCVLimit', 1000);
                        if ($length >= $limit) {
                            array_shift($stored);
                        }
                        $updates[$marketId][$timeframe] = true;
                    }
                }
                $this->ohlcvs[$symbol][$timeframe] = $stored;
            }
        }
        $name = 'SubscribeTicker';
        $marketIds = is_array($updates) ? array_keys($updates) : array();
        for ($i = 0; $i < count($marketIds); $i++) {
            $marketId = $marketIds[$i];
            $timeframes = is_array($updates[$marketId]) ? array_keys($updates[$marketId]) : array();
            for ($j = 0; $j < count($timeframes); $j++) {
                $timeframe = $timeframes[$j];
                $messageHash = $name . ':' . $timeframe . ':' . $marketId;
                $market = $this->safe_market($marketId);
                $symbol = $market['symbol'];
                $stored = $this->safe_value($this->ohlcvs[$symbol], $timeframe, array());
                $client->resolve ($stored, $messageHash);
            }
        }
    }

    public function watch_order_book($symbol, $limit = null, $params = array ()) {
        return Async\async(function () use ($symbol, $limit, $params) {
            $omsId = $this->safe_integer($this->options, 'omsId', 1);
            Async\await($this->load_markets());
            $market = $this->market($symbol);
            $symbol = $market['symbol'];
            $name = 'SubscribeLevel2';
            $messageHash = $name . ':' . $market['id'];
            $url = $this->urls['api']['ws'];
            $requestId = $this->request_id();
            $limit = ($limit === null) ? 100 : $limit;
            $payload = array(
                'OMSId' => $omsId,
                'InstrumentId' => intval($market['id']), // conditionally optional
                // 'Symbol' => $market['info']['symbol'], // conditionally optional
                'Depth' => $limit, // default 100
            );
            $request = array(
                'm' => 0, // $message type, 0 $request, 1 reply, 2 subscribe, 3 event, unsubscribe, 5 error
                'i' => $requestId, // sequence number identifies an individual $request or $request-and-response pair, to your application
                'n' => $name, // function $name is the $name of the function being called or that the server is responding to, the server echoes your call
                'o' => $this->json($payload), // JSON-formatted string containing the data being sent with the $message
            );
            $subscription = array(
                'id' => $requestId,
                'messageHash' => $messageHash,
                'name' => $name,
                'symbol' => $symbol,
                'marketId' => $market['id'],
                'method' => array($this, 'handle_order_book_subscription'),
                'limit' => $limit,
                'params' => $params,
            );
            $message = array_merge($request, $params);
            $orderbook = Async\await($this->watch($url, $messageHash, $message, $messageHash, $subscription));
            return $orderbook->limit ($limit);
        }) ();
    }

    public function handle_order_book($client, $message) {
        //
        //     {
        //         m => 3,
        //         $i => 2,
        //         n => 'Level2UpdateEvent',
        //         o => [[2,1,1608208308265,0,20782.49,1,25000,8,1,1]]
        //     }
        //
        $payload = $this->safe_value($message, 'o', array());
        //
        //     array(
        //         0,   // 0 MDUpdateId
        //         1,   // 1 Number of Unique Accounts
        //         123, // 2 ActionDateTime in Posix format X 1000
        //         0,   // 3 ActionType 0 (New), 1 (Update), 2(Delete)
        //         0.0, // 4 LastTradePrice
        //         0,   // 5 Number of Orders
        //         0.0, // 6 Price
        //         0,   // 7 ProductPairCode
        //         0.0, // 8 Quantity
        //         0,   // 9 Side
        //     ),
        //
        $firstBidAsk = $this->safe_value($payload, 0, array());
        $marketId = $this->safe_string($firstBidAsk, 7);
        if ($marketId === null) {
            return $message;
        }
        $market = $this->safe_market($marketId);
        $symbol = $market['symbol'];
        $orderbook = $this->safe_value($this->orderbooks, $symbol);
        if ($orderbook === null) {
            return $message;
        }
        $timestamp = null;
        $nonce = null;
        for ($i = 0; $i < count($payload); $i++) {
            $bidask = $payload[$i];
            if ($timestamp === null) {
                $timestamp = $this->safe_integer($bidask, 2);
            } else {
                $newTimestamp = $this->safe_integer($bidask, 2);
                $timestamp = max ($timestamp, $newTimestamp);
            }
            if ($nonce === null) {
                $nonce = $this->safe_integer($bidask, 0);
            } else {
                $newNonce = $this->safe_integer($bidask, 0);
                $nonce = max ($nonce, $newNonce);
            }
            // 0 new, 1 update, 2 remove
            $type = $this->safe_integer($bidask, 3);
            $price = $this->safe_float($bidask, 6);
            $amount = $this->safe_float($bidask, 8);
            $side = $this->safe_integer($bidask, 9);
            // 0 buy, 1 sell, 2 short reserved for future use, 3 unknown
            $orderbookSide = ($side === 0) ? $orderbook['bids'] : $orderbook['asks'];
            // 0 new, 1 update, 2 remove
            if ($type === 0) {
                $orderbookSide->store ($price, $amount);
            } elseif ($type === 1) {
                $orderbookSide->store ($price, $amount);
            } elseif ($type === 2) {
                $orderbookSide->store ($price, 0);
            }
        }
        $orderbook['nonce'] = $nonce;
        $orderbook['timestamp'] = $timestamp;
        $orderbook['datetime'] = $this->iso8601($timestamp);
        $name = 'SubscribeLevel2';
        $messageHash = $name . ':' . $marketId;
        $this->orderbooks[$symbol] = $orderbook;
        $client->resolve ($orderbook, $messageHash);
    }

    public function handle_order_book_subscription($client, $message, $subscription) {
        //
        //     {
        //         m => 1,
        //         i => 1,
        //         n => 'SubscribeLevel2',
        //         o => [[1,1,1608204295901,0,20782.49,1,18200,8,1,0]]
        //     }
        //
        $payload = $this->safe_value($message, 'o', array());
        //
        //     array(
        //         array(
        //             0,   // 0 MDUpdateId
        //             1,   // 1 Number of Unique Accounts
        //             123, // 2 ActionDateTime in Posix format X 1000
        //             0,   // 3 ActionType 0 (New), 1 (Update), 2(Delete)
        //             0.0, // 4 LastTradePrice
        //             0,   // 5 Number of Orders
        //             0.0, // 6 Price
        //             0,   // 7 ProductPairCode
        //             0.0, // 8 Quantity
        //             0,   // 9 Side
        //         ),
        //     )
        //
        $symbol = $this->safe_string($subscription, 'symbol');
        $snapshot = $this->parse_order_book($payload, $symbol);
        $limit = $this->safe_integer($subscription, 'limit');
        $orderbook = $this->order_book($snapshot, $limit);
        $this->orderbooks[$symbol] = $orderbook;
        $messageHash = $this->safe_string($subscription, 'messageHash');
        $client->resolve ($orderbook, $messageHash);
    }

    public function handle_subscription_status($client, $message) {
        //
        //     {
        //         m => 1,
        //         i => 1,
        //         n => 'SubscribeLevel2',
        //         o => '[[1,1,1608204295901,0,20782.49,1,18200,8,1,0]]'
        //     }
        //
        $subscriptionsById = $this->index_by($client->subscriptions, 'id');
        $id = $this->safe_integer($message, 'i');
        $subscription = $this->safe_value($subscriptionsById, $id);
        if ($subscription !== null) {
            $method = $this->safe_value($subscription, 'method');
            if ($method === null) {
                return $message;
            } else {
                return $method($client, $message, $subscription);
            }
        }
    }

    public function handle_message($client, $message) {
        //
        //     {
        //         "m" => 0, // $message type, 0 request, 1 reply, 2 subscribe, 3 $event, unsubscribe, 5 error
        //         "i" => 0, // sequence number identifies an individual request or request-and-response pair, to your application
        //         "n":"function name", // function name is the name of the function being called or that the server is responding to, the server echoes your call
        //         "o":"payload", // JSON-formatted string containing the data being sent with the $message
        //     }
        //
        //     {
        //         m => 1,
        //         i => 1,
        //         n => 'SubscribeLevel2',
        //         o => '[[1,1,1608204295901,0,20782.49,1,18200,8,1,0]]'
        //     }
        //
        //     {
        //         m => 3,
        //         i => 2,
        //         n => 'Level2UpdateEvent',
        //         o => '[[2,1,1608208308265,0,20782.49,1,25000,8,1,1]]'
        //     }
        //
        $payload = $this->safe_string($message, 'o');
        if ($payload === null) {
            return $message;
        }
        $message['o'] = json_decode($payload, $as_associative_array = true);
        $methods = array(
            'SubscribeLevel2' => array($this, 'handle_subscription_status'),
            'SubscribeLevel1' => array($this, 'handle_ticker'),
            'Level2UpdateEvent' => array($this, 'handle_order_book'),
            'Level1UpdateEvent' => array($this, 'handle_ticker'),
            'SubscribeTrades' => array($this, 'handle_trades'),
            'TradeDataUpdateEvent' => array($this, 'handle_trades'),
            'SubscribeTicker' => array($this, 'handle_ohlcv'),
            'TickerDataUpdateEvent' => array($this, 'handle_ohlcv'),
        );
        $event = $this->safe_string($message, 'n');
        $method = $this->safe_value($methods, $event);
        if ($method === null) {
            return $message;
        } else {
            return $method($client, $message);
        }
    }
}
