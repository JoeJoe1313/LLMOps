const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const openai = require("./openai");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const systemPrompt = "You are an expert in public speaking, and you know how to create engaging and powerful speaches.";

io.on("connection", (socket) => {
    console.log("New client connected");

    // Send initial message when a client connects
    socket.emit("chat response", "Hello! I am here to help you.");

    let conversationHistory = [
        { role: "system", content: systemPrompt }
    ];

    socket.on("chat message", async (message) => {
        try {
            // Emit "thnking" status
            socket.emit("thinking", true);

            // Add user message to conversation history
            conversationHistory.push({ role: "user", content: message });

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: conversationHistory,
            });

            const response = completion.choices[0].message.content;

            // Add assistant response to conversation history
            conversationHistory.push({ role: "assistant", content: response });

            // Emit "thinking" status as false
            socket.emit("thinking", false);

            socket.emit("chat response", response);
        } catch (error) {
            console.error("Error:", error);
            // Emit "thinking" status as false in case of error
            socket.emit("thinking", false);
            socket.emit("chat response", "Sorry there was an error processing your requrest.");
        }        
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
