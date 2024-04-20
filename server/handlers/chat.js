const Users = require("../models/User");
const { getMilliSeconds } = require("../utils/timeUtils");
const { newId } = require("../utils/numberUtils");

async function handleTransaction(chat, user, callback) {
    const session = await Users.startSession();
    session.startTransaction();

    try {
        await chat.save({ session });
        await user.save({ session });

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();

        console.error("Error While saving a new message with socket", error);
        return callback(new Error("Error while sending the message"));
    } finally {
        session.endSession();
    }
}

function inputValidation(sessionId, email, message, update_message, callback) {
    if(typeof sessionId !== "string" || sessionId.trim().length === 0) {
        return callback("Invalid session ID");
    }
    const emailRegex = /^\w+@[a-zA-Z]+\.[a-zA-Z]+$/;
    if(!emailRegex.test(email)) {
        return callback("Invalid email");
    }
    if(typeof message !== "string" || typeof update_message !== "string") {
        return callback("Invalid message");
    }
    if(message.trim().length === 0) {
        return callback("Message cannot be empty");
    }
    if(message.trim().length > 500 || update_message.trim().length > 500) {
        return callback("Message is too long, maximum is 500 characters");
    }
}

export function run(socket) {
    socket.use(async (socket, next) => {
        if(socket.handshake.auth) {
            try {
                const { email, name, role } = socket.handshake.auth;
                const user = await Users.findOne(({ email }));
    
                if(!(user.name == name || user.role == role)) {
                    return next(new Error("Unauthorized Connection"));
                }
    
                socket.email = email;
                socket.name = name;
                next();    
            } catch(error) {
                console.error(error);
                return next(new Error("Error during handshaking"));
            }
        } else
            return next(new Error("Error during handshaking"));
    })
    socket.on("send_message", async(message, sessionId, callback) => {
        try {
            await inputValidation(sessionId, socket.email, message, null, callback);
            const user = await Users.findOne({ email: socket.email });
    
            if(!user.chats.includes(sessionId)) {
                callback("Unauthorized Connection");
            }
    
            const chat = user.chats.find(chat => chat.sessionId == sessionId);
            chat.messages.push({
                Id: newId,
                sender: socket.email,
                content: message,
                log: {
                    to: message,
                    action: 'create',
                    executor: user.email,
                    date: getMilliSeconds()
                }
            });

            await handleTransaction(chat, user, callback);

            socket.to(sessionId).emit('new_message', user.name, getMilliSeconds());
    
            callback('ok');    
        } catch (error) {
            console.error("Error while sending a new message with socket", error);
            return callback(new Error("Error while sending the message"));
        }
    })
    socket.on("update_message", async(messageId, updated_message, sessionId, callback) => {
        try {
            await inputValidation(sessionId, email, null, updated_message, callback);
            const user = await Users.findOne({ email: socket.email });

            if(!user.chats.includes(sessionId)) {
                callback("Unauthorized Connection");
            }
    
            const chat = user.chats.find(chat => chat.sessionId == sessionId);
            const message = chat.messages.find(message => message.Id == messageId);
            if(!message) {
                callback("Message not found");
            }

            if(message.sender != socket.email) return callback("Unauthorized Connection");
    
            const old_message = message.log.find(log => log.active == true);
            if(old_message) old_message.active = false;
    
            message.content = updated_message;
            message.log.push({
                from: old_message.content,
                to: updated_message,
                action: (updated_message.trim() === '' ? 'delete' : 'edit'),
                executor: user.email,
                date: getMilliSeconds(),
            })
    
            await handleTransaction(chat, user, callback);

            socket.to(sessionId).emit('update_message', messageId, updated_message, getMilliSeconds());
    
            callback('ok')
        } catch (error) {
            console.error("Error while updating a message with socket", error);
            return callback(new Error("Error while updating the message"));
        }
    })
}