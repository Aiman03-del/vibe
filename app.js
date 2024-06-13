const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const favicon = require("serve-favicon");

const Song = require("./models/songs");

const app = express();

app.use(favicon(path.join(__dirname, "favicon.ico")));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static folder to serve files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connecting to DB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/myapp", {
      useUnifiedTopology: true,
    });
    console.log("DB is connected");
  } catch (error) {
    console.log("DB is not connected");
    console.error(error);
    process.exit(1);
  }
};
connectDB();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "image") {
      cb(null, "uploads/images/");
    } else if (file.fieldname === "file") {
      cb(null, "uploads/audio/");
    }
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Multer upload configuration
const upload = multer({ storage: storage });

app.get("/register", (req, res) => {
  res.status(200).sendFile(path.join(__dirname, "index.html"));
});

app.post(
  "/submit-song",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, desc, duration } = req.body;
      const imageUrl = `${req.protocol}://${req.get(
        "host"
      )}/${req.files.image[0].path.replace(/\\/g, "/")}`;
      const fileUrl = `${req.protocol}://${req.get(
        "host"
      )}/${req.files.file[0].path.replace(/\\/g, "/")}`;

      const newSong = new Song({
        name: name,
        image: imageUrl,
        file: fileUrl,
        desc: desc,
        duration: duration,
      });

      const savedSong = await newSong.save();

      res
        .status(200)
        .json({ message: "Song submitted successfully", song: savedSong });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Song submission failed" });
    }
  }
);

app.get("/songs", async (req, res) => {
  try {
    const songs = await Song.find();
    res.status(200).json(songs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch songs" });
  }
});

app.get("/songs/:id", async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }
    res.status(200).json(song);
  } catch (error) {
    res.status(500).json({ error: "Failed to load song data" });
  }
});

app.delete("/delete-song/:id", async (req, res) => {
  try {
    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) {
      return res.status(404).json({ error: "Song not removed" });
    }
    res.status(200).json({ message: "Song removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove song" });
  }
});

// Add a new POST route for editing songs
app.post("/edit-song", upload.none(), async (req, res) => {
  try {
    const { editSongId, editDesc, editDuration } = req.body;
    const updatedSong = await Song.findByIdAndUpdate(
      editSongId,
      { desc: editDesc, duration: editDuration },
      { new: true }
    );
    if (!updatedSong) {
      return res.status(404).json({ error: "Song not found" });
    }
    res.status(200).json(updatedSong);
  } catch (error) {
    res.status(500).json({ error: "Failed to update song" });
  }
});

module.exports = app;
