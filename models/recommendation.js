const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recommendationSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },
    recommendedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recommendedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound unique index to prevent duplicate recommendations from the same user to the same friend for the same listing
recommendationSchema.index({ listing: 1, recommendedBy: 1, recommendedTo: 1 }, { unique: true });

module.exports = mongoose.model("Recommendation", recommendationSchema);
