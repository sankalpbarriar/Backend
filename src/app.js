import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//configuring JSON
app.use(express.json({limit:"16kb"}))

//configuring url
app.use(express.urlencoded({extended: true}))

//configuring static->public data
app.use(express.static("public"))

//configuring cookies-> applying CRUD methods on user cookies
app.use(cookieParser()) 

export { app };
