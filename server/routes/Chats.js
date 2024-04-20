const express = require("express");
const router = express.Router();

const Chat = require("../models/Chat");
const User = require("../models/User");

const { verifySession } = require("../middlewares/auth");
const { attachUserDataToRequest } = require("../middlewares/attachUserData");
const { getMilliSeconds } = require("../utils/timeUtils.js")
const { newId } = require("../utils/numberUtils");
const { handleBadRequest } = require("../handlers/error.js");

router.use(verifySession);
router.use((req, res, next) => attachUserDataToRequest(req, res, next, ['chats']));

router.get("/", async(req, res) => {
    const { sessionId, type } = req.query;

    if(sessionId) {
        const hasChat = req.user.chats.find(chat => chat.sessionId == sessionId);
        if(hasChat || req.user.role != 'admin') {
            const chat = await Chat.findOne({ sessionId });

            return res.json({ chat });
        } else         
            return handleBadRequest(res, `no chat session with the id ${sessionId}`);
    }

    const chats = await Chat.find({ 
        type: type || { $exists: true }
    });

    res.json({ chats });
});

router.post("/", async(req, res) => {
    const email = req.body.email || req.email;
    const type = req.body.type;

    const newChat = await Chat.create({
        sessionId: newId(),
        userLog: {
            email: email,
            action: 'created',
            executor: req.email,
            date: getMilliSeconds()
        },
        type: type
    });

    const user = await User.findOne({ email });
    user.chats.push(newChat);
    await user.save();

    res.json({ newChat });
})

router.put("/", async(req, res) => {
    const { sessionId, email, type, action } = req.body;
    const chat = await Chat.findOne({ sessionId });
    let user;

    if(email != null) {
        user = await User.findOne({ email });

        chat.userLog.push({
            email: email,
            action: action,
            executor: req.email,
            date: getMilliSeconds()
        })

        action == 'added' ? user.chats.push(chat) : user.chats.splice(user.chats.findIndex(c => c._id === chat._id), 1)
    }

    if(type != null) chat.type = type;

    await chat.save();
    if(user != null) await user.save();

    res.json({ chat });
})

module.exports = router;