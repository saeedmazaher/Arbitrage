import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import axios from "axios";
import { SocksProxyAgent } from "socks-proxy-agent";

const proxy = "socks5://127.0.0.1:443"; // مثلاً پروکسی تور یا وی‌پی‌ان

const agent = new SocksProxyAgent(proxy);
// const apiClient = axios.create({
//   baseURL: "https://api.coinex.com/v2",
//   headers: {
//     "Content-Type": "application/json"
//   },
// });
// ابتدا خطاهای uncaughtException
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down ...");
  console.log(err.name, err.message);
  process.exit(1);
});

// ایمپورت‌ها
import credentials from "./middleware/credential.js";
import corsOptions from "./corsOptions.js";
import AppError from "./utils/AppError.js";
import globalErrorHandler from "./controllers/errorController.js";
import run from "./arbitrage/arbitrage.js";
import { pro as ccxt } from "ccxt";

// تنظیمات اولیه
dotenv.config();
const app = express();

// Middleware لاگینگ
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// میدلورها
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.json());

// مسیرها
app.get("/", (_req, res) => {
  res.json({ message: "root" });
});

app.get("/test", async (req, res) => {
  testIP();
});

// مسیر catch-all (باید در انتها باشد)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// هندلر خطای جهانی
app.use(globalErrorHandler);

// اتصال به MongoDB
mongoose
  .connect(process.env.MONGO_URI_LOCAL)
  .then(() => console.log("Connected to MONGODB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// شروع به اجرای پروسه آربیتراژ
const startArbitrageScanner = () => {
  let lastArbitrageTime = Date.now();
  fetchArbitrageOpportunities(2);
  // setInterval(() => {
  //   fetchArbitrageOpportunities(2); // 2 درصد اختلاف قیمت

  //   // برای هر دقیقه یکبار بررسی برای به‌روزرسانی رکوردها
  //   if (Date.now() - lastArbitrageTime >= 60000) {
  //     lastArbitrageTime = Date.now();
  //   }
  // }, 60000); // هر 1 دقیقه یکبار
};

// راه اندازی سرور
const PORT = process.env.PORT || 3600;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const testIP = async () => {
  let res = await axios.get("https://api.ipify.org?format=json");
  console.log("Your current public IP:", res.data.ip);
};



// لیست صرافی‌ها از کلاینت (مثلاً از فرم یا API)
// const selectedExchanges = ['kucoin', 'coinex', 'coincatch','binance']
// run(selectedExchanges)



async function checkSupportForWatchTickers() {
  // دریافت لیست همه صرافی‌ها از کتابخانه ccxt
  const exchangeIds = Object.keys(ccxt);

  for (const id of exchangeIds) {
    try {
      const exchange = new ccxt[id]();

      // بررسی می‌کنیم که آیا متد watchTickers در این صرافی موجود است
      if (exchange.has.watchTickers) {
        console.log(`${id} supports watchTickers`);
      } else {
        console.log(`${id} does not support watchTickers`);
      }
    } catch (err) {
      console.error(`Error checking support for ${id}:`, err.message);
    }
  }
}
// checkSupportForWatchTickers()





// // لیست صرافی‌هایی که می‌خوای بررسی کنی
// const selectedExchanges = ['coincatch', 'kucoin', 'coinex','bingx']
// const volumeThreshold = 10000 // حداقل حجم دلاری برای فیلتر دوم
// const intervalHours = 24 // فاصله بررسی‌ها به ساعت
// //------------------------------------------------------------------------------------------------------------------------+
// // تابع گرفتن توکن‌ها از هر صرافی                                                                                        |
// //------------------------------------------------------------------------------------------------------------------------+
// async function fetchExchangeMarkets(exchangeId) {
//   try {
//     console.time('fetchExchangeMarkets Time');
//     const exchange = new ccxt[exchangeId]()
//     await exchange.loadMarkets()
//     console.timeEnd('fetchExchangeMarkets Time');
//     return {
//       id: exchangeId,
//       markets: Object.values(exchange.markets)
//     }
//   } catch (err) {
//     console.error(`Error fetching markets for ${exchangeId}:`, err.message)
//     return { id: exchangeId, markets: [] }
//   }
 
// }
// //------------------------------------------------------------------------------------------------------------------------+
// // تابع گرفتن توکن‌هایی که فقط در یک صرافی هستن رو حذف می‌کنه                                                           |
// //------------------------------------------------------------------------------------------------------------------------+
// function filterCommonSymbols(exchangeMarketsList) {
//   console.time('filterCommonSymbols Time');
//   // ساخت لیست همه نمادها و اینکه در کدوم صرافی‌ها هستن
//   const symbolMap = {}
//   for (const { id, markets } of exchangeMarketsList) {
//     for (const market of markets) {
//       const symbol = market.symbol
//       if (!symbolMap[symbol]) symbolMap[symbol] = new Set()
//       symbolMap[symbol].add(id)
//     }
//   }
//   // فقط توکن‌هایی که در بیش از یک صرافی هستن نگه می‌داریم
//   const commonSymbols = Object.keys(symbolMap).filter(
//     symbol => symbolMap[symbol].size > 1
//   )
//   console.timeEnd('filterCommonSymbols Time');
//   return commonSymbols
// }
// //------------------------------------------------------------------------------------------------------------------------+
// // گرفتن حجم دلاری 24 ساعته برای هر توکن از هر صرافی                                                                    |
// //------------------------------------------------------------------------------------------------------------------------+
// async function fetchVolumeForSymbols(exchangeMarketsList, symbols) {
//   console.time('fetchVolumeForSymbols Time');
//   const symbolsToProcess = symbols.slice(0, 10);

  
//   const volumeMap = {}

//   // ساخت یک آرایه از تمام درخواست‌های fetchTicker
//   const allPromises = []

//   for (const { id: exchangeId } of exchangeMarketsList) {
//     const exchange = new ccxt[exchangeId]()
    
//     for (const symbol of symbolsToProcess) {
//       const promise = exchange.fetchTicker(symbol)
//         .then(ticker => {
//           const volume = ticker.baseVolume * ticker.last
//           if (!volumeMap[symbol]) volumeMap[symbol] = []
//           volumeMap[symbol].push({ exchangeId, volume })
//         })
//         .catch(err => {
//           // اگر خطایی رخ داد، هیچ کاری انجام نمی‌دهیم
//         })
      
//       allPromises.push(promise)  // افزودن هر promise به آرایه
//     }
//   }
//   // صبر کردن برای تکمیل تمام درخواست‌ها به صورت موازی
//   await Promise.all(allPromises)
//   console.timeEnd('fetchVolumeForSymbols Time');
//   return volumeMap
// }
// //------------------------------------------------------------------------------------------------------------------------+
// // فیلتر نهایی بر اساس حجم معاملات                                                                                       |
// //------------------------------------------------------------------------------------------------------------------------+

// function filterByVolume(volumeMap, threshold) {
//   const validSymbols = []

//   for (const [symbol, volumes] of Object.entries(volumeMap)) {
//     const isLowVolumeInAnyExchange = volumes.some(v => v.volume < threshold)
//     if (!isLowVolumeInAnyExchange) {
//       validSymbols.push(symbol)
//     }
//   }

//   return validSymbols
// }
// //------------------------------------------------------------------------------------------------------------------------+
// // محاسبه اختلاف قیمت بین دو صرافی
// //------------------------------------------------------------------------------------------------------------------------+
// async function comparePricesBetweenExchanges(exchangeMarketsList, symbols) {
//   console.time('comparePricesBetweenExchanges Time');
 
//   for (let i = 0; i < exchangeMarketsList.length; i++) {
//     //console.log(exchangeMarketsList[i])
//     const exchange = exchangeMarketsList[i];
//     if (exchange.has['watchTickers']) {
//       while (true) {
//           try {
//               await exchange.watchTickers(["BTC/USDT","ETH/USDT"])
//               console.log (new Date (), exchange.tickers)
//           } catch (e) {
//               console.log (e.message)
//               break
//               // stop the loop on exception or leave it commented to retry
//               // throw e
//           }
//       }
//     }
//   }


//   // for (let i = 0; i < exchangeMarketsList.length; i++) {
//   //   const exchange1 = exchangeMarketsList[i];
//   //   for (let j = i + 1; j < exchangeMarketsList.length; j++) {
//   //     const exchange2 = exchangeMarketsList[j];

//   //     console.log(`Comparing prices between ${exchange1.id} and ${exchange2.id}:`);

//   //     // ایجاد WebSocket برای هر صرافی
//   //     const exchange1Instance = new ccxt[exchange1.id]();
//   //     const exchange2Instance = new ccxt[exchange2.id]();

//   //     // گوش دادن به داده‌های WebSocket از صرافی‌ها
//   //     for (const symbol of symbols) {
//   //       try {
//   //         // دریافت داده‌های لایو برای هر توکن
//   //         const ticker1 = await exchange1Instance.watchTicker(symbol);
//   //         const ticker2 = await exchange2Instance.watchTicker(symbol);

//   //         const price1 = ticker1.last;
//   //         const price2 = ticker2.last;

//   //         if (price1 && price2) {
//   //           const priceDifference = Math.abs(price1 - price2);
//   //           console.log(`${symbol}: ${exchange1.id} price = ${price1}, ${exchange2.id} price = ${price2}, Difference = ${priceDifference}`);
//   //         }
//   //       } catch (err) {
//   //         console.error(`Error comparing prices for ${symbol} between ${exchange1.id} and ${exchange2.id}:`, err.message);
//   //       }
//   //     }
//   //   }
//   // }

//   console.timeEnd('comparePricesBetweenExchanges Time');
// }

// //------------------------------------------------------------------------------------------------------------------------+
// // اجرای کل مراحل با هم
// //------------------------------------------------------------------------------------------------------------------------+
// async function runFilteringPipeline() {
//   console.log(`[START] Token filtering process started.`)

//   // مرحله ۱: گرفتن توکن‌ها
//   const exchangeMarketsList = await Promise.all(
//     selectedExchanges.map(fetchExchangeMarkets)
//   )
  
//   // مرحله ۲: حذف توکن‌هایی که فقط در یک صرافی هستن
//   const commonSymbols = filterCommonSymbols(exchangeMarketsList)
//   console.log("commonSymbols => "+commonSymbols.length)

//   // مرحله ۳: فیلتر کردن با توجه به حجم دلاری
//   const volumeMap = await fetchVolumeForSymbols(exchangeMarketsList, commonSymbols)
//   console.log("volumeMap => "+JSON.stringify(volumeMap))
//   const finalSymbols = filterByVolume(volumeMap, volumeThreshold)

//   console.log(`[RESULT] Final token count: ${finalSymbols.length}`)
//   console.log(`[TOKENS] ${finalSymbols.join(', ')}`)

//   // مرحله ۴: مقایسه اختلاف قیمت‌ها بین صرافی‌ها
//   await comparePricesBetweenExchanges(exchangeMarketsList, finalSymbols)

//   console.log(`[END] Filtering process completed.`)
// }

// //------------------------------------------------------------------------------------------------------------------------+
// // زمان‌بندی اجرای هر ۲۴ ساعت یکبار
// //------------------------------------------------------------------------------------------------------------------------+
// setInterval(runFilteringPipeline, intervalHours * 60 * 60 * 1000)
// runFilteringPipeline()

// // const exchange = new ccxt["coinex"]()
// // const tickers = await exchange.watchTickers()
// // console.log(tickers)


// // let exchange = new ccxt.coinex()
// // if (exchange.has['watchTickers']) {
// //   while (true) {
// //       try {
// //           const tickers1 = await exchange.watchTickers(["BTC/USDT","ETH/USDT"])
// //           console.log (new Date (), exchange.tickers)
// //       } catch (e) {
// //           console.log (e.message)
// //           break
// //           // stop the loop on exception or leave it commented to retry
// //           // throw e
// //       }
// //   }
// // }
















// هندلر unhandledRejection
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
