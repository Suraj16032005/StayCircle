const User = require("../models/user.js");
const Recommendation = require("../models/recommendation.js");
const Listing = require("../models/listing.js");

module.exports.renderReceived = async (req, res) => {
    let query = { recommendedTo: req.user._id };
    let filteredFriend = null;
    
    if (req.query.friendId) {
        query.recommendedBy = req.query.friendId;
        filteredFriend = await User.findById(req.query.friendId);
    }
    
    const recommendations = await Recommendation.find(query)
        .populate("listing")
        .populate("recommendedBy");
        
    res.render("recommendations/index.ejs", { recommendations, filteredFriend });
};

module.exports.renderSent = async (req, res) => {
    const recommendations = await Recommendation.find({ recommendedBy: req.user._id })
        .populate("listing")
        .populate("recommendedTo");
        
    res.render("recommendations/sent.ejs", { recommendations });
};

module.exports.createRecommendation = async (req, res) => {
    const { listingId, friendId, message } = req.body;
    
    if (!listingId || !friendId) {
        req.flash("error", "Invalid recommendation request.");
        return res.redirect("back");
    }

    const user = await User.findById(req.user._id);
    if (!user.friends.includes(friendId)) {
        req.flash("error", "You can only recommend listings to connected friends.");
        return res.redirect("back");
    }

    // Check duplicate
    const existing = await Recommendation.findOne({
        listing: listingId,
        recommendedBy: req.user._id,
        recommendedTo: friendId
    });

    if (existing) {
        req.flash("error", "You have already recommended this listing to this friend.");
        return res.redirect("back");
    }

    const newRecommendation = new Recommendation({
        listing: listingId,
        recommendedBy: req.user._id,
        recommendedTo: friendId,
        message: message ? message.trim() : ""
    });

    await newRecommendation.save();

    // Create and save database notification for offline loading
    const Notification = require("../models/notification");
    const socket = require("../socket/socket");
    
    // Find listing details to form a helpful notification message
    const listing = await Listing.findById(listingId);
    
    const notification = new Notification({
        recipient: friendId,
        sender: req.user._id,
        type: "recommendation",
        message: `${req.user.name || req.user.username} recommended ${listing.title}.`,
        listing: listingId
    });
    await notification.save();

    // Emit live Socket.IO events to recommended friend
    socket.sendToUser(friendId, "notification", {
        _id: notification._id,
        type: "recommendation",
        message: notification.message,
        createdAt: notification.createdAt
    });

    // Live Trust Score update calculation
    const newTrustScore = await Recommendation.countDocuments({ listing: listingId });

    // Emit trust score update to listing detail room
    socket.broadcastToRoom(`listing:${listingId}`, "trust-score-update", {
        listingId,
        trustScore: newTrustScore
    });

    // Emit recommendation count update globally
    socket.broadcastGlobal("recommendation-count", {
        listingId,
        trustScore: newTrustScore
    });

    // Support AJAX requests
    if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
        return res.json({ success: true, listingId, trustScore: newTrustScore });
    }

    req.flash("success", "Recommendation sent successfully!");
    res.redirect(`/listings/${listingId}`);
};
