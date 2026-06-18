const express = require("express");
const router = express.Router();
const recommendationController = require("../controller/recommendation.js");
const { isLoggedIn } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync");

router.route("/")
    .get(isLoggedIn, wrapAsync(recommendationController.renderReceived))
    .post(isLoggedIn, wrapAsync(recommendationController.createRecommendation));

router.route("/sent")
    .get(isLoggedIn, wrapAsync(recommendationController.renderSent));

module.exports = router;
