// arbitrage.js
import { pro as ccxt } from "ccxt";

const volumeThreshold = 10000

// مرحله ۱: دریافت مارکت و تیکر برای هر صرافی
async function fetchExchangeData(exchangeId) {
  try {
    const exchange = new ccxt[exchangeId]()
    await exchange.loadMarkets()
    const tickers = await exchange.fetchTickers()
    console.log("fetchExchangeData => "+exchangeId+" | Tickers : "+ Object.keys(tickers).length+" | markets : "+ Object.keys(exchange.markets).length)
    return { id: exchangeId, tickers, markets: exchange.markets }
  } catch (err) {
    console.error(`❌ ${exchangeId}:`, err.message)
    return { id: exchangeId, tickers: {}, markets: {} }
  }
}

// مرحله ۲: فیلتر کردن توکن‌های مشترک و دارای حجم مناسب
function filterValidSymbols(exchangeDataList) {
  const symbolMap = {}

  for (const { id, tickers } of exchangeDataList) {
    for (const symbol in tickers) {
      const ticker = tickers[symbol]
      const volume = ticker.baseVolume * ticker.last
      if (volume >= volumeThreshold) {
        if (!symbolMap[symbol]) symbolMap[symbol] = []
        symbolMap[symbol].push(id)
      }
    }
  }
  console.log("symbolMap => "+Object.keys(symbolMap).length)
  const validSymbols = {}
  for (const symbol in symbolMap) {
    if (symbolMap[symbol].length > 1) {
      validSymbols[symbol] = symbolMap[symbol]
    }
  }
  console.log("validSymbols => "+Object.keys(validSymbols).length)
  return validSymbols
}

// مرحله ۳: ساخت جفت‌های مقایسه بین صرافی‌ها برای هر توکن
function buildComparisonPairs(validSymbolsMap) {
  const compareMap = {}
  for (const [symbol, exchanges] of Object.entries(validSymbolsMap)) {
    const pairs = []
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        pairs.push([exchanges[i], exchanges[j]])
      }
    }
    compareMap[symbol] = pairs
  }
  console.log("compareMap => "+Object.keys(compareMap).length)
  return compareMap
}

// مرحله ۴: مقایسه اختلاف قیمت با WebSocket به صورت زنده
async function startLivePriceComparison(compareMap, exchangeDataList) {
  const exchangeMap = {}
  for (const { id } of exchangeDataList) {
    exchangeMap[id] = new ccxt[id]()
  }

  for (const [exchangeId, exchange] of Object.entries(exchangeMap)) {
    const symbols = Object.keys(compareMap).filter(s => compareMap[s].some(p => p.includes(exchangeId)))
    if (symbols.length === 0) continue

    // اتصال WebSocket و گرفتن تیکرها
    ;(async () => {
      while (true) {
        try {
          const tickers = await exchange.watchTickers(symbols)
          for (const [symbol, ticker] of Object.entries(tickers)) {
            const relevantPairs = compareMap[symbol].filter(p => p.includes(exchangeId))
            for (const [ex1, ex2] of relevantPairs) {
              if (!exchangeMap[ex1] || !exchangeMap[ex2]) continue
              const t1 = tickers[symbol]?.last
              const t2 = exchangeMap[ex2].tickers?.[symbol]?.last
              if (t1 && t2) {
                const diff = Math.abs(t1 - t2)
                const percent = ((diff / Math.min(t1, t2)) * 100).toFixed(2)
                if(percent>0.1)
                console.log(`🔄 ${symbol}: ${ex1}=${t1} vs ${ex2}=${t2} | Δ ${percent}% | diff : ${diff}`)
              }
            }
          }
          
        } catch (err) {
          console.warn(`⚠️ WebSocket error on ${exchangeId}:`, err.message)
          await new Promise(r => setTimeout(r, 5000))
        }
      }
    })()
  }
}

// اجرای مراحل به ترتیب
async function run(exchanges) {
  const data = await Promise.all(exchanges.map(fetchExchangeData))
  const validSymbols = filterValidSymbols(data)
  const compareMap = buildComparisonPairs(validSymbols)
  await startLivePriceComparison(compareMap, data)
}

export default run;

