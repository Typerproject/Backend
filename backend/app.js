var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth");
const searchRouter = require("./routes/search");

const userRouter = require("./routes/user");

const postRouter = require("./routes/post");
const commentRouter = require("./routes/comment");
const shinhanRouter = require("./routes/shinhanapi");

const cors = require("cors");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://typer.kro.kr/",
      "https://typer.kro.kr",
    ],
    credentials: true,
  })
);
app.use("/api", apiRouter);
app.use("/api/auth", authRouter);

app.use("/api/search", searchRouter);
app.use("/api/user", userRouter);
app.use("/api/post", postRouter);
app.use("/api/comment", commentRouter);

app.use("/api/shinhan", shinhanRouter);

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
  if (err instanceof mongoose.Error.CastError) {
    // CastError 처리
    const errorMessage = `Invalid value for ${err.path}: ${err.value}`;
    console.error(errorMessage); // 서버 로그에 오류 기록

    return res.status(400).json({
      error: "InvalidObjectId",
      message: errorMessage,
      path: err.path,
      value: err.value,
      kind: err.kind,
    });
  }
  res.status(500).json({
    err: err,
  });
  return;
});

module.exports = app;
