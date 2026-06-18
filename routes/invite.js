const express = require("express");
const router = express.Router();
const inviteController = require("../controller/invite.js");
const { isLoggedIn } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync");

router.route("/")
    .get(isLoggedIn, wrapAsync(inviteController.renderInvites));

router.route("/create")
    .post(isLoggedIn, wrapAsync(inviteController.createInvite));

module.exports = router;
