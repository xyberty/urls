const express = require("express");
const mongoose = require("mongoose");
const ShortUrl = require("./shortUrl");
require("dotenv").config();
const app = express();

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to database!!"))
  .catch((err) => console.log(err));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.get("/", async (req, res) => {
  const shortUrls = await ShortUrl.find();
  res.render("index", { shortUrls: shortUrls });
});

app.post("/shortUrls", async (req, res) => {
  await ShortUrl.create({ full: req.body.fullUrl });
  res.redirect("/");
});
app.get("/:shortUrl", async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
  if (shortUrl == null) return res.sendStatus(404);
  shortUrl.clicks++;
  shortUrl.save();
  res.redirect(shortUrl.full);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
