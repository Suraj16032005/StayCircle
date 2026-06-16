const Listing=require("../models/listing.js");
const Review=require("../models/review.js");

module.exports.postReview = async(req,res)=>{
 let listing=await Listing.findById(req.params.id);
  // make sure rating is a number
    req.body.review.rating = Number(req.body.review.rating);
    console.log(req.body.review);

 let newReview= new Review(req.body.review);
 newReview.author= req.user._id;
 listing.reviews.push(newReview);
 await newReview.save();
 await listing.save();
 req.flash("success", "review uploaded successfully");
 res.redirect(`/listings/${listing._id}`);
};

module.exports.deleteReview= async (req,res)=>{
    let {id, reviewId}= req.params;
    await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","Deleted the review!");
     res.redirect(`/listings/${id}`);
};