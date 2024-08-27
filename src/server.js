const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const ejs = require("ejs");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e7,
});
const PORT = process.env.PORT || 3211;

app.engine("ejs", ejs.renderFile);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.redirect("/server");
});

app.get("/server", (req, res) => {
  res.render("index", { userType: "server" });
});

app.get("/client/:id", (req, res) => {
  const clientId = req.params.id;
  res.render("index", { userType: "client", clientId });
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.emit("message", "Welcome to the chat!");

  // Handle text messages
  socket.on("chatMessage", (content) => {
    console.log("Received chat message:", content);
    // Emit the message to all clients including the server
    io.emit("message", content);
  });

  // Handle voice notes
  socket.on("voiceNote", (base64String) => {
    console.log("Received voice note");
    const audioBuffer = Buffer.from(base64String, "base64");
    const audioFileName = `audio-${Date.now()}.wav`;
    const audioFilePath = path.join(__dirname, "public", audioFileName);

    fs.writeFile(audioFilePath, audioBuffer, (err) => {
      if (err) {
        console.error("Error saving audio:", err);
        return;
      }
      io.emit("audioMessage", `/${audioFileName}`);
    });
  });

  // Handle video notes
  socket.on("videoNote", (base64String) => {
    console.log("Received video note");
    const videoBuffer = Buffer.from(base64String, "base64");
    const videoFileName = `video-${Date.now()}.webm`;
    const videoFilePath = path.join(__dirname, "public", videoFileName);

    fs.writeFile(videoFilePath, videoBuffer, (err) => {
      if (err) {
        console.error("Error saving video:", err);
        return;
      }
      io.emit("videoMessage", `/${videoFileName}`);
    });
  });

  // Handle file notes
  socket.on("fileNote", (fileData) => {
    console.log("Received file note");
    const fileBuffer = Buffer.from(fileData.data, "base64");
    const fileName = `file-${Date.now()}-${fileData.name}`;
    const filePath = path.join(__dirname, "public", fileName);

    fs.writeFile(filePath, fileBuffer, (err) => {
      if (err) {
        console.error("Error saving file:", err);
        return;
      }
      io.emit("fileMessage", { name: fileData.name, url: `/${fileName}` });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
