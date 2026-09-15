const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = new Map();

io.on("connection", (socket) => {
    console.log("Utilisateur connecté");

    socket.on("register", (name) => {
        const cleanName = String(name || "").trim();

        if (!cleanName) {
            return;
        }

        users.set(cleanName.toLowerCase(), {
            name: cleanName,
            socketId: socket.id
        });

        socket.data.userName = cleanName;

        sendUsers();
    });

    socket.on("privateMessage", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();
        const text = String(data && data.text ? data.text : "").trim();

        if (!from || !to || !text) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            socket.emit("errorMessage", "Utilisateur introuvable.");
            return;
        }

        const message = {
            from: from,
            to: receiver.name,
            text: text,
            type: "text",
            time: getTime()
        };

        io.to(receiver.socketId).emit("privateMessage", message);
        socket.emit("privateMessage", message);
    });

    socket.on("privateAudio", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();
        const audio = data && data.audio ? data.audio : null;

        if (!from || !to || !audio) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            socket.emit("errorMessage", "Utilisateur introuvable.");
            return;
        }

        const message = {
            from: from,
            to: receiver.name,
            audio: audio,
            type: "audio",
            time: getTime()
        };

        io.to(receiver.socketId).emit("privateAudio", message);
        socket.emit("privateAudio", message);
    });

    socket.on("call-user", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();

        if (!from || !to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            socket.emit("errorMessage", "Utilisateur introuvable.");
            return;
        }

        io.to(receiver.socketId).emit("incoming-call", {
            from: from
        });
    });

    socket.on("accept-call", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();

        if (!from || !to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("call-accepted", {
            from: from
        });
    });

    socket.on("reject-call", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();

        if (!from || !to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("call-rejected", {
            from: from
        });
    });

    socket.on("end-call", (data) => {
        const from = socket.data.userName;
        const to = String(data && data.to ? data.to : "").trim();

        if (!from || !to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("call-ended", {
            from: from
        });
    });

    socket.on("webrtc-offer", (data) => {
        const to = String(data && data.to ? data.to : "").trim();

        if (!to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("webrtc-offer", {
            from: socket.data.userName,
            offer: data.offer
        });
    });

    socket.on("webrtc-answer", (data) => {
        const to = String(data && data.to ? data.to : "").trim();

        if (!to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("webrtc-answer", {
            from: socket.data.userName,
            answer: data.answer
        });
    });

    socket.on("webrtc-ice-candidate", (data) => {
        const to = String(data && data.to ? data.to : "").trim();

        if (!to) {
            return;
        }

        const receiver = users.get(to.toLowerCase());

        if (!receiver) {
            return;
        }

        io.to(receiver.socketId).emit("webrtc-ice-candidate", {
            from: socket.data.userName,
            candidate: data.candidate
        });
    });

    socket.on("disconnect", () => {
        const name = socket.data.userName;

        if (name) {
            users.delete(name.toLowerCase());
        }

        sendUsers();

        console.log("Utilisateur déconnecté");
    });
});

function sendUsers() {
    const list = Array.from(users.values()).map((user) => user.name);
    io.emit("users", list);
}

function getTime() {
    const now = new Date();

    return (
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0")
    );
}

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
    console.log("Maury Chat démarré sur le port " + PORT);
});