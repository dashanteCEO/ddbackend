const express = require("express");
require("dotenv").config();
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const hpp = require("hpp");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const authRoutes = require('./auth/auth')
const posts = require('./posts/posts')
const cors = require("cors")

const DB = async () => {
  try {
    const { connection } =  mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,      
    } ,console.log("Connected to MongoDB Atlas"));
  } catch (error) {
    console.log(error);
  }
};
DB()
app.use(mongoSanitize());
app.use(morgan("dev"));
app.use(xss());
app.use(hpp());
app.use(express.json({ limit: "10kb" }));
app.use("/api/user", authRoutes.router);
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/posts", posts);
app.use("/api/post/assets/:filename", posts);

const port = process.env.PORT || 8000;
app.listen(port, console.log(`listening on port ${port}`));
