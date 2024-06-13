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

//connecting to DB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/myapp", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("db is connected");
  } catch (error) {
    console.log("db is not connected");
    console.log(error);
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
      // Debug logging
      console.log("Request files: ", req.files);
      console.log("Request body: ", req.body);

      if (!req.files || !req.files.image || !req.files.file) {
        return res.status(400).json({ error: "Image or file not provided" });
      }

      const { name, desc, duration } = req.body;
      if (!name || !desc || !duration) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

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
      console.error("Error submitting song:", error);
      res.status(500).json({ error: "Song submission failed" });
    }
  }
);

app.get("/songs", async (req, res) => {
  try {
    const songs = await Song.find();
    res.status(200).json(songs);
  } catch (error) {
    res.status(500).json({ error: "Songs lists are not added" });
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
    res.status(500).json({ error: "Songs data not loaded" });
  }
});

app.delete("/delete-song/:id", async (req, res) => {
  try {
    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) {
      return res.status(404).json({ error: "song not removed" });
    }
    res.status(200).json({ message: "song removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "song not removed" });
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
      return res.status(404).json({ error: "song not found" });
    }
    res.status(200).json(updatedSong);
  } catch (error) {
    res.status(500).json({ error: "unable to update song" });
  }
});

module.exports = app;
