// require ('dotenv').config({path: './env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';

connectDB()        //asynchronous function hence return a promise
.then(()=>{
  app.listen(process.env.PORT || 8000, ()=>{
    console.log(` Server is running at port : ${process.env.PORT}`)
  })
})
.catch((err)=>{
  console.log("MONGO db connection failed !!!",err)
})

dotenv.config({
  path:'./env'
})













//  USING IFFE  appr-->1
/*
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERROR ", err);
      throw error;
    });

    app.listen(process.env.PORT,()=>{
        console.log(`App is listening on ${process.env.PORT}`);
    })
  } catch (error) {
    console.error("ERROR: ", error);
    throw err;
  }
})();
*/
