const path = require("path");
const express = require("express");
const compression = require("compression");
const dotenv = require("dotenv");
const cors = require("cors-express");

const filesRouter = require("./routes/files");

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

app.use("/files", express.static(path.join(__dirname, "files")));

app.use(process.env.api, filesRouter);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ success: false, message: message });
});

app.listen(process.env.port, "localhost", () => {
  console.log("listening on port " + process.env.port);
});
