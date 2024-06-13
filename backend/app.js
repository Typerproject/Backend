var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const postRouter = require("./routes/post");

const cors = require("cors");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use("/api", apiRouter);
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/post", postRouter);

//mongodb연결을위해 비밀번호 가림
const dotenv = require("dotenv");
dotenv.config();

// mongodb 연결
const mongoose = require("mongoose");
const { getOAuth } = require("./utils/stockAuth");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connecting"))
  .catch((err) => console.log(err));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(() => {
  getOAuth();
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
