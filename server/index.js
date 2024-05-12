import express, { text } from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const PORT = process.env.PORT || 3500;
const ADMIN = "Admin";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`ok listinging on port ${PORT}`);
});

const userState = {
  users: [],
  setUsers: function (newUserState) {
    this.users = newUserState;
  },
};

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
  socket.emit("message", buildMsg(ADMIN, "welcome to chat.."));

  socket.on("enterRoom", ({ name, room }) => {
    //leave the prev room
    const prevRoom = getUser(socket.id)?.room;
    if (prevRoom) {
      socket.leave(prevRoom);

      //sending a message the the left room only after a user leaves
      io.to(prevRoom).emit("message", buildMsg(ADMIN, `${name} left!`));
    }
    const user = activateUser(socket.id, name, room);
    if (prevRoom) {
      io.to(prevRoom).emit("userList", {
        users: getroomUsers(prevRoom),
      });
    }

    socket.join(user.room);

    socket.emit("message", buildMsg(ADMIN, `welcome to ${user.room}!`));

    socket.broadcast
      .to(user.room)
      .emit("message", buildMsg(ADMIN, `${user.name} joind!`));

    io.to(user.room).emit("userList", {
      users: getroomUsers(user.room),
    });

    io.emit("roomList", {
      rooms: getActiveRooms(),
    });
  });

  //when a user leaves
  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    userLeaveasApp(user);
    if (user) {
      io.to(user.room).emit("message", buildMsg(ADMIN, `${user.name} left!`));
      io.to(user.room).emit("userList", {
        users: getroomUsers(user.room),
      });
      io.emit("roomList", {
        rooms: getActiveRooms(),
      });
    }
  });

  socket.on("message", ({ name, text }) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      io.to(room).emit("message", buildMsg(name, text));
    }
  });

  socket.on("activity", (name) => {
    const room = getUser(socket.id)?.room;
    if (room) {
      socket.broadcast.to(room).emit("activity", name);
    }
  });
});

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat("default", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(new Date()),
  };
}

function activateUser(id, name, room) {
  const user = { id, name, room };
  userState.setUsers([
    ...userState.users.filter((user) => user.id !== id),
    user,
  ]);
  return user;
}

function userLeaveasApp(id) {
  userState.setUsers(userState.users.filter((user) => user.id !== id));
}

function getUser(id) {
  return userState.users.find((user) => user.id !== id);
}

function getroomUsers(room) {
  return userState.users.filter((user) => user.room === room);
}

function getActiveRooms() {
  return Array.from(new Set(userState.users.map((user) => user.room)));
}
