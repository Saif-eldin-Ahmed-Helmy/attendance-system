require('dotenv').config();
const express = require('express'),
    app = express(),
    server = require("node:http").createServer(app),
    { Server } = require("socket.io"),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    session = require('express-session'),
    MongoStore = require('connect-mongo'),
    cors = require('cors'),

    port = 3001,
    
    connectToDatabase = require('./config/database'),
    mongooseConnectionPromise = connectToDatabase();

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true,    
    }
});

const chatIo = io.of("/chat");
const chatHandler = require("./handlers/chat");

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

const routeNames = ['Cart', 'Chats', 'CouponCodes', 'Images', 'Items', 'Orders', 'Users'];
routeNames.forEach(routeName => {
    const route = require(`./routes/${routeName}`);
    app.use(`/api/${routeName.toLowerCase()}`, route);
});

// const usersRouter = require('./routes/Users');
// app.use('/api/users', usersRouter);

// const itemsRouter = require('./routes/Items');
// app.use('/api/items', itemsRouter);

// const cartRouter = require('./routes/Cart');
// app.use('/api/cart', cartRouter);

// const imagesRouter = require('./routes/Images');
// app.use('/api/images', imagesRouter);

// const ordersRoute = require('./routes/Orders');
// app.use('/api/orders', ordersRoute);

// const couponRoute = require("./routes/CouponCodes");
// app.use('./api/couponCodes', couponRoute);

// const chatsRoute = require("./routes/Chats");
// app.use('/api/chats', chatsRoute);

chatHandler(userIo);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});