const express=require("express");
const router=express.Router({mergeParams:true});
const User=require("../models/user");
const Notification=require("../models/notification");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl, isLoggedIn } = require("../middleware");
const userController = require("../controller/user.js");

router.route("/signup")
.get(userController.renderSignUpForm)
.post( wrapAsync(userController.signUp));

router.route("/login")
.get(userController.renderLoginPage)
.post(saveRedirectUrl, passport.authenticate("local",{
    failureRedirect: "/login",
    failureFlash: true,
}), userController.login
);

router.get("/logout", userController.logout);

// Route to mark all notifications as read via AJAX
router.post("/notifications/mark-all-read", isLoggedIn, wrapAsync(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
}));

module.exports=router;