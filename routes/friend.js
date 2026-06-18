const express = require("express");
const router = express.Router();
const friendController = require("../controller/friend.js");
const { isLoggedIn } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync");

router.route("/")
    .get(isLoggedIn, wrapAsync(friendController.renderFriends));

router.route("/search")
    .get(isLoggedIn, wrapAsync(friendController.searchFriends));

router.route("/request/:id")
    .post(isLoggedIn, wrapAsync(friendController.sendRequest));

router.route("/accept/:id")
    .post(isLoggedIn, wrapAsync(friendController.acceptRequest));

router.route("/reject/:id")
    .post(isLoggedIn, wrapAsync(friendController.rejectRequest));

module.exports = router;
