const { Server } = require("socket.io");
const User = require("../models/user");

// In-memory mapping to store active user sockets
let io;
const userSockets = new Map(); // userId string -> socketId string
const socketUsers = new Map(); // socketId string -> userId string

/**
 * Initializes the Socket.IO server and binds connection event listeners.
 * @param {object} server - The HTTP server instance.
 */
function init(server) {
    io = new Server(server);

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        
        if (userId && userId !== "undefined") {
            // Track user socket ID
            userSockets.set(userId, socket.id);
            socketUsers.set(socket.id, userId);
            console.log(`🔌 Socket Connected: User ${userId} on socket ${socket.id}`);

            // Notify online friends that this user has connected
            notifyFriendsOfStatus(userId, true);
        }

        // Handle joining room for specific listing details page
        socket.on("join-listing-room", (listingId) => {
            socket.join(`listing:${listingId}`);
            console.log(`🏠 Socket ${socket.id} joined listing room: listing:${listingId}`);
        });

        // Handle socket disconnection
        socket.on("disconnect", () => {
            const associatedUserId = socketUsers.get(socket.id);
            if (associatedUserId) {
                socketUsers.delete(socket.id);
                // Ensure we only clear mapping if this is the active socket for the user
                if (userSockets.get(associatedUserId) === socket.id) {
                    userSockets.delete(associatedUserId);
                    console.log(`❌ Socket Disconnected: User ${associatedUserId}`);
                    // Notify online friends that this user has gone offline
                    notifyFriendsOfStatus(associatedUserId, false);
                }
            }
        });
    });

    return io;
}

/**
 * Notifies all online friends of a user's status change, and informs the user of online friends.
 * @param {string} userId - The user ID whose status changed.
 * @param {boolean} isOnline - Whether the user is now online.
 */
async function notifyFriendsOfStatus(userId, isOnline) {
    try {
        const user = await User.findById(userId).populate("friends");
        if (!user || !user.friends) return;

        const onlineFriendsList = [];

        // Inform friends who are online
        for (const friend of user.friends) {
            const friendIdStr = friend._id.toString();
            const friendSocketId = userSockets.get(friendIdStr);

            if (friendSocketId) {
                if (isOnline) {
                    onlineFriendsList.push(friendIdStr);
                }

                // Notify friend that this user changed status
                io.to(friendSocketId).emit("online-users", {
                    userId: userId,
                    status: isOnline ? "online" : "offline"
                });
            }
        }

        // Send list of current online friends to the connecting user
        if (isOnline) {
            const userSocketId = userSockets.get(userId);
            if (userSocketId) {
                io.to(userSocketId).emit("online-users", {
                    onlineFriends: onlineFriendsList
                });
            }
        }
    } catch (err) {
        console.error("Error in notifying friend status:", err);
    }
}

/**
 * Sends a real-time event to a specific user if they are online.
 * @param {string} userId - The recipient user ID.
 * @param {string} event - The socket event name.
 * @param {object} data - The event payload.
 * @returns {boolean} - True if the event was sent, false if user is offline.
 */
function sendToUser(userId, event, data) {
    const socketId = userSockets.get(userId.toString());
    if (socketId && io) {
        io.to(socketId).emit(event, data);
        return true;
    }
    return false;
}

/**
 * Broadcasts an event to all sockets subscribed to a specific room.
 * @param {string} roomName - The name of the room.
 * @param {string} event - The socket event name.
 * @param {object} data - The event payload.
 */
function broadcastToRoom(roomName, event, data) {
    if (io) {
        io.to(roomName).emit(event, data);
    }
}

/**
 * Broadcasts an event globally to all connected sockets.
 * @param {string} event - The socket event name.
 * @param {object} data - The event payload.
 */
function broadcastGlobal(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

/**
 * Checks if a user is currently online.
 * @param {string} userId - The user ID.
 * @returns {boolean} - True if online, false otherwise.
 */
function isUserOnline(userId) {
    return userSockets.has(userId.toString());
}

module.exports = {
    init,
    sendToUser,
    broadcastToRoom,
    broadcastGlobal,
    isUserOnline
};
