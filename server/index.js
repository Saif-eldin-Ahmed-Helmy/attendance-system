require('dotenv').config();
const express = require('express'),
    app = express(),
    server = require("node:http").createServer(app),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    session = require('express-session'),
    MongoStore = require('connect-mongo'),
    cors = require('cors'),

    port = 3001,

    connectToDatabase = require('./config/database'),
    mongooseConnectionPromise = connectToDatabase();

app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:5173"],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

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

const usersRouter = require('./routes/Users');
app.use('/api/users', usersRouter);

const studentsRouter = require('./routes/Students');
app.use('/api/students', studentsRouter);

const subjectsRouter = require('./routes/Subjects');
app.use('/api/subjects', subjectsRouter);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});