const Listing=require("../models/listing");
const Recommendation=require("../models/recommendation");
const User=require("../models/user");

module.exports.index= async (req, res) => {
    let { country } = req.query;
    let alllistings;
    if (country) {
        alllistings = await Listing.find({ country: { $regex: new RegExp(country.trim(), 'i') } }).populate("reviews");
    } else {
        alllistings = await Listing.find().populate("reviews");
    }

    const recommendations = await Recommendation.find({});
    const trustScores = {};
    recommendations.forEach(rec => {
        if (rec.listing) {
            const key = rec.listing.toString();
            trustScores[key] = (trustScores[key] || 0) + 1;
        }
    });

    let processedListings = alllistings.map(listing => {
        const obj = listing.toObject();
        obj.trustScore = trustScores[listing._id.toString()] || 0;
        
        let sum = 0;
        if (obj.reviews && obj.reviews.length > 0) {
            sum = obj.reviews.reduce((acc, r) => acc + r.rating, 0) / obj.reviews.length;
        }
        obj.avgRating = sum;
        return obj;
    });

    // Sort listings: first by trustScore descending, second by avgRating descending
    processedListings.sort((a, b) => {
        if (b.trustScore !== a.trustScore) {
            return b.trustScore - a.trustScore;
        }
        return b.avgRating - a.avgRating;
    });

    const maxTrustScore = processedListings.length ? Math.max(...processedListings.map(l => l.trustScore || 0)) : 0;

    res.render("listings/alllistings.ejs", { alllistings: processedListings, country, maxTrustScore });
};

module.exports.renderNewForm= async (req, res) => {
    console.log("new form working");
    res.render("listings/new.ejs");
};

module.exports.showListing= async (req, res) => {
    let { id } = req.params;
    let individualListing = await Listing.findById(id).populate({path: "reviews", populate : {path:"author"}}).populate("owner");
    if(!individualListing){
        req.flash("error", "the item u want to access is deleted!");
        return res.redirect("/listings");
    }
    
    let friends = [];
    if (req.user) {
        const user = await User.findById(req.user._id).populate("friends");
        friends = user ? user.friends : [];
    }

    const trustScore = await Recommendation.countDocuments({ listing: id });

    let sum = 0;
    for (let review of individualListing.reviews) {
        sum += review.rating;
    }
    let avgRating = individualListing.reviews.length ? (sum / individualListing.reviews.length) : 0;

    res.render("listings/show.ejs", { individualListing, friends, trustScore, avgRating });
};

module.exports.newListing= async (req, res, next) => {
    let url=req.file.path;
    let filename=req.file.filename;
    console.log(url,"..",filename);
    const listing = req.body.listing;
    const newListing = new Listing(listing);
    newListing.owner=req.user._id;
    newListing.image={url,filename};
    await newListing.save();
    req.flash("success","A new listing has been created!");
    res.redirect("/listings");
};

module.exports.updateListing=async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing });
    if(typeof req.file !=="undefined"){
    let url=req.file.path;
    let filename=req.file.filename;
    listing.image={url, filename};
    await listing.save();
    }
    req.flash("success","Updated data!");
    res.redirect(`/listings/${id}`);
};

module.exports.renderEditListing=async (req, res) => {
    
    let { id } = req.params;
    let EditList = await Listing.findById(id);
    if(!EditList){
        req.flash("error", "the item u want to access is deleted!");
        res.redirect("/listings");
    }
    let originalUrl=listing.image.url;
    originalUrl=originalUrl.replace("/upload","upload/w_250");
    res.render("listings/edit.ejs", { EditList,originalUrl });
};

module.exports.deleteListing=async (req, res) => {
    let { id } = req.params;
    let deleteditem = await Listing.findByIdAndDelete(id);
    console.log(deleteditem);
    req.flash("success","Deleted a Listing!");
    res.redirect("/listings");
};