require('dotenv').config();
const express = require('express'),
    app = express(),
    server = require("node:http").createServer(app),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    session = require('express-session'),
    MongoStore = require('connect-mongo'),
    cors = require('cors'),
    WebSocket = require('ws'),

    port = 3001,

    connectToDatabase = require('./config/database'),
    mongooseConnectionPromise = connectToDatabase();

app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:5173"],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const wss = new WebSocket.Server({ server:server });

wss.on('connection', function connection(ws) {
    console.log('A new client Connected!');
    ws.send('Welcome New Client!');
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

app.use(
    session({
        secret: process.env.ACCESS_TOKEN_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: {
            secure: process.env.NODE_ENV === 'production', // set secure to true in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // set sameSite to 'none' in production and 'lax' in development
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
            rolling: true,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

const sendToClients = (message) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

app.post('/websocket/message', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).send('Message is required');
    }

    // Send message to all WebSocket clients
    sendToClients(message);

    res.status(200).send('Message sent to WebSocket clients');
});

const usersRouter = require('./routes/Users');
app.use('/api/users', usersRouter);

const studentsRouter = require('./routes/Students');
app.use('/api/students', studentsRouter);

const subjectsRouter = require('./routes/Subjects');
app.use('/api/subjects', subjectsRouter);

const cameraRouter = require('./routes/Camera');
app.use('/api/camera', cameraRouter);

const announcementRouter = require('./routes/Announcement');
app.use('/api/announcement', announcementRouter);

const materialRouter = require('./routes/Material');
app.use('/api/material', materialRouter);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});