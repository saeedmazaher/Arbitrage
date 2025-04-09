import AppError from "../utils/AppError.js";

const handleEntityParseFailed = () => {
  const message = "رشته  JSON معتبر نیست"
  return new AppError(message, 400);
}

const sendErrorDev = (err,res)=>{
  res.status(err.statusCode).json({
    status : err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
};

const sendErrorProd = (err,res)=>{
  console.log({message :err.message,status: err.status});
  if(err.isOperational){
    res.status(err.statusCode).json({
      status : err.status,
      message: err.message
    })
  }else{
    console.log("ERROR : ",err);
    res.status(500).json({
      status: "error",
      message:"خطایی در سرور رخ داده است"
    })
  }
};

const globalErrorHandler = (err,req,res,next)=>{
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if(process.env.NODE_ENV?.trim() === "development"){
    return sendErrorDev(err,res);
  } else if(process.env.NODE_ENV?.trim() === "production"){
    let error = {...err,message : err.message};
    if(err.type === "entity.parse.failed") error = handleEntityParseFailed();
    return sendErrorProd(error,res)
  }
}

export default globalErrorHandler;