const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inviteSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    usedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

module.exports = mongoose.model("Invite", inviteSchema);
