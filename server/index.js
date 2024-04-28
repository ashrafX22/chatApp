import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 3500;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`ok listinging on port ${PORT}`);
});

const io = new Server(expressServer, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? false
        : ["http://127.0.0.1:5500", "http://localhost:5500"],
  },
});

io.on("connection", (socket) => {
  console.log(`user ${socket.id} connected!`);

  //this is exclusive to the just connected user.
  socket.emit("message", "welcome to chat App");

  //to all users exept you
  socket.broadcast.emit("message", `user${socket.id.substring(0, 5)} joined!`);

  socket.on("message", (data) => {
    //this is to all users.
    io.emit("message", `${socket.id.substring(0, 5)}: ${data}`);
  });
  //when a user leave
  socket.on("disconnect", () => {
    socket.broadcast.emit(
      "message",
      `user "${socket.id.substring(0, 5)}" left!`
    );
  });
  socket.on("activity", (name) => {
    socket.broadcast.emit("activity", name);
  });
});
