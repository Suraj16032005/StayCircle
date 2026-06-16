const Listing=require("../models/listing");

module.exports.index= async (req, res) => {
    let { country } = req.query;
    let alllistings;
    if (country) {
        alllistings = await Listing.find({ country: { $regex: new RegExp(country.trim(), 'i') } });
    } else {
        alllistings = await Listing.find();
    }
    res.render("listings/alllistings.ejs", { alllistings, country });
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
        res.redirect("/listings");
    }
    console.log(individualListing);
    res.render("listings/show.ejs", { individualListing });
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