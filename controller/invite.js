const Invite = require("../models/invite.js");
const crypto = require("crypto");

module.exports.renderInvites = async (req, res) => {
    const invites = await Invite.find({ createdBy: req.user._id }).populate("usedBy");
    res.render("users/invites.ejs", { invites });
};

module.exports.createInvite = async (req, res) => {
    let code;
    let exists = true;
    
    // In the extremely rare case of code collision, loop until a unique one is generated
    while (exists) {
        code = crypto.randomBytes(4).toString("hex").toUpperCase();
        const found = await Invite.findOne({ code });
        if (!found) {
            exists = false;
        }
    }

    const newInvite = new Invite({
        code,
        createdBy: req.user._id
    });
    
    await newInvite.save();
    req.flash("success", `Invite code ${code} generated successfully!`);
    res.redirect("/invites");
};
