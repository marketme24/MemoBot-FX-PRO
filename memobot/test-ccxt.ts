import ccxt from 'ccxt';

async function test() {
  const exchange = new ccxt.binance();
  exchange.parseBalance = function(response: any) {
    return response;
  }
  console.log(Object.keys(exchange.has));
}

test();
