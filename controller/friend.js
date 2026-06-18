const User = require("../models/user.js");
const FriendRequest = require("../models/friendRequest.js");

module.exports.renderFriends = async (req, res) => {
    const user = await User.findById(req.user._id).populate("friends");
    const incomingRequests = await FriendRequest.find({ receiver: req.user._id, status: "pending" }).populate("sender");
    res.render("users/friends.ejs", { friends: user.friends, incomingRequests });
};

module.exports.searchFriends = async (req, res) => {
    const query = req.query.q ? req.query.q.trim() : "";
    if (!query) {
        return res.render("users/search.ejs", { results: [], query: "" });
    }

    const user = await User.findById(req.user._id);
    const excludeIds = [user._id, ...user.friends];

    // Find matching users (by username or email)
    const results = await User.find({
        _id: { $nin: excludeIds },
        $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } }
        ]
    });

    // Check sent/received requests to display status
    const pendingRequests = await FriendRequest.find({
        $or: [
            { sender: req.user._id, receiver: { $in: results.map(r => r._id) } },
            { receiver: req.user._id, sender: { $in: results.map(r => r._id) } }
        ]
    });

    // Map results with status
    const resultsWithStatus = results.map(result => {
        const reqExist = pendingRequests.find(pr => 
            (pr.sender.toString() === req.user._id.toString() && pr.receiver.toString() === result._id.toString()) ||
            (pr.receiver.toString() === req.user._id.toString() && pr.sender.toString() === result._id.toString())
        );
        return {
            user: result,
            requestStatus: reqExist ? reqExist.status : "none",
            requestId: reqExist ? reqExist._id : null
        };
    });

    res.render("users/search.ejs", { results: resultsWithStatus, query });
};

module.exports.sendRequest = async (req, res) => {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
        req.flash("error", "You cannot send a friend request to yourself.");
        return res.redirect("/friends");
    }

    const user = await User.findById(req.user._id);
    if (user.friends.includes(targetId)) {
        req.flash("error", "You are already friends with this user.");
        return res.redirect("/friends");
    }

    // Check existing request in either direction
    const existing = await FriendRequest.findOne({
        $or: [
            { sender: req.user._id, receiver: targetId },
            { sender: targetId, receiver: req.user._id }
        ]
    });

    if (existing) {
        req.flash("error", "A friend request already exists between you and this user.");
        return res.redirect("/friends");
    }

    const newRequest = new FriendRequest({
        sender: req.user._id,
        receiver: targetId,
        status: "pending"
    });

    await newRequest.save();

    // Create and save database notification for offline loading
    const Notification = require("../models/notification");
    const socket = require("../socket/socket");
    const notification = new Notification({
        recipient: targetId,
        sender: req.user._id,
        type: "friend-request",
        message: `${req.user.name || req.user.username} sent you a friend request.`
    });
    await notification.save();

    // Emit live Socket.IO events to friend
    socket.sendToUser(targetId, "notification", {
        _id: notification._id,
        type: "friend-request",
        message: notification.message,
        createdAt: notification.createdAt
    });
    socket.sendToUser(targetId, "friend-request", {
        senderName: req.user.name || req.user.username,
        senderUsername: req.user.username,
        requestId: newRequest._id
    });

    // Support AJAX requests
    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res.json({ success: true });
    }

    req.flash("success", "Friend request sent!");
    res.redirect("/friends");
};

module.exports.acceptRequest = async (req, res) => {
    const requestId = req.params.id;
    const request = await FriendRequest.findById(requestId);

    if (!request) {
        req.flash("error", "Friend request not found.");
        return res.redirect("/friends");
    }

    // Security Check: Users cannot accept requests not addressed to them
    if (request.receiver.toString() !== req.user._id.toString()) {
        req.flash("error", "You are not authorized to accept this request.");
        return res.redirect("/friends");
    }

    // Add both to friends arrays
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    // Delete request
    await FriendRequest.findByIdAndDelete(requestId);

    // Create and save database notification for offline loading
    const Notification = require("../models/notification");
    const socket = require("../socket/socket");
    const notification = new Notification({
        recipient: request.sender,
        sender: req.user._id,
        type: "friend-accepted",
        message: `${req.user.name || req.user.username} accepted your friend request.`
    });
    await notification.save();

    // Emit live Socket.IO events to the request sender
    socket.sendToUser(request.sender, "notification", {
        _id: notification._id,
        type: "friend-accepted",
        message: notification.message,
        createdAt: notification.createdAt
    });

    const acceptorUser = await User.findById(req.user._id);
    const isAcceptorOnline = socket.isUserOnline(req.user._id);
    socket.sendToUser(request.sender, "friend-accepted", {
        friend: {
            _id: acceptorUser._id,
            name: acceptorUser.name,
            username: acceptorUser.username,
            status: isAcceptorOnline ? "online" : "offline"
        }
    });

    // Support AJAX requests
    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
        const senderUser = await User.findById(request.sender);
        const isSenderOnline = socket.isUserOnline(request.sender);
        return res.json({
            success: true,
            friend: {
                _id: senderUser._id,
                name: senderUser.name,
                username: senderUser.username,
                status: isSenderOnline ? "online" : "offline"
            }
        });
    }

    req.flash("success", "Friend request accepted!");
    res.redirect("/friends");
};

module.exports.rejectRequest = async (req, res) => {
    const requestId = req.params.id;
    const request = await FriendRequest.findById(requestId);

    if (!request) {
        req.flash("error", "Friend request not found.");
        return res.redirect("/friends");
    }

    // Security Check: Users cannot reject requests not addressed to them
    if (request.receiver.toString() !== req.user._id.toString()) {
        req.flash("error", "You are not authorized to reject this request.");
        return res.redirect("/friends");
    }

    // Delete request
    await FriendRequest.findByIdAndDelete(requestId);

    // Support AJAX requests
    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res.json({ success: true });
    }

    req.flash("success", "Friend request rejected.");
    res.redirect("/friends");
};
