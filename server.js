import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import axios from "axios"
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


// مسیرها
app.get('/exchange', async (req, res) => {
  axios
  .get("https://api.coinex.com/v2/spot/market?market=BTCUSDT",{proxy: false})
  .then((res) => {
    console.log("✅ جواب اومد:", res.data);
  })
  .catch((err) => {
    console.error("❌ خطا:", err.message);
    console.error(err);
  });
});

// مسیر catch-all (باید در انتها باشد)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// هندلر خطای جهانی
app.use(globalErrorHandler);

// اتصال به MongoDB
mongoose.connect(process.env.MONGO_URI_LOCAL)
  .then(() => console.log("Connected to MONGODB successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// راه اندازی سرور
const PORT = process.env.PORT || 3600;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// هندلر unhandledRejection
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message); 
  server.close(() => {
    process.exit(1);
  });
});