const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema defining notifications for user activities
const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["friend-request", "friend-accepted", "recommendation"],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // Associated listing for recommendations
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create index on recipient and createdAt desc for quick rendering of user notifications dropdown
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
