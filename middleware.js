const Listing= require("./models/listing.js");
const {listingSchema}=require("./schema.js");
const ExpressError=require("./utils/ExpressError.js");
const {reviewSchema}=require("./schema.js");
const Review = require("./models/review.js");

module.exports.isLoggedIn=(req,res,next)=>{
    console.log(req.user);
    if(!req.isAuthenticated()){
        if (req.method === "GET") {
            req.session.redirectUrl = req.originalUrl;
        } else {
            const match = req.originalUrl.match(/^\/listings\/([a-zA-Z0-9]+)/);
            if (match) {
                req.session.redirectUrl = `/listings/${match[1]}`;
            } else {
                req.session.redirectUrl = "/listings";
            }
        }
        req.flash("error","Please Login Before Access!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl=(req,res,next)=>{
 if(req.session.redirectUrl){
    res.locals.redirectUrl =req.session.redirectUrl;
 }
 next();
}

module.exports.isOwner= async (req,res,next)=>{
    let {id} =req.params;
    let listing=await Listing.findById(id);
    if(!listing.owner._id.equals(res.locals.currUser._id)){
        req.flash("error", "you dont have access");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

module.exports.validateListing=(req,res,next)=>{
    let {error}= listingSchema.validate(req.body);
    if(error){
        throw new ExpressError(400,error);
    }
    else{
        next();
    }
};

module.exports.validateReview=(req,res,next)=>{
    let {error}= reviewSchema.validate(req.body);
    if(error){
        throw new ExpressError(400,error);
    }
    else{
        next();
    }
};

module.exports.isReviewAuthor= async (req,res,next)=>{
    let {reviewId,id} =req.params;
    let review=await Review.findById(reviewId);
    if(!review.author._id.equals(res.locals.currUser._id)){
        req.flash("error", "you arent the author");
        return res.redirect(`/listings/${id}`);
    }
    next();
}