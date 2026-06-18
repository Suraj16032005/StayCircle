if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();  // load .env only in development
}


const express = require("express"); ///used for parsing, giving responses
const session = require('express-session');
const { MongoStore } = require("connect-mongo");

const app = express();  // Ye function:
const mongoose = require("mongoose");
const methodOverride = require("method-override");
app.use(methodOverride("_method")); // jab bhi post ka put ya delete karvana ho tab
const ExpressError=require("./utils/ExpressError.js");


const listingRouter=require("./routes/listing.js");
const reviewsRouter=require("./routes/review.js");
const usersRouter=require("./routes/user.js");
const inviteRouter=require("./routes/invite.js");
const friendRouter=require("./routes/friend.js");
const recommendationRouter=require("./routes/recommendation.js");

const flash=require("connect-flash");
const passport=require("passport");
const localStrategy=require("passport-local");
const User=require("./models/user.js");
const dbUrl=process.env.ATLASDB_URL;


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect(dbUrl);
    console.log("✅ MongoDB Connected");
}


const path = require("path");
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));//parsing ke liye
app.use(express.static(path.join(__dirname, "/public"))); //public me sari files hai
const port = 8080;

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {secret: process.env.SECRET},
    touchAfter: 24 * 60 * 60 // time period in seconds
});

store.on("error", function(e){
    console.log("session store error", e);
});

const sessionOptions= {
    store,
    secret : process.env.SECRET,
     resave: false,
      saveUninitialized:true,
    cookie:{
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true 
    }};

    //root page
app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

// Save the user info in session
passport.serializeUser(User.serializeUser());

// Retrieve the user info from session
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

app.get("/demouser", async (req,res)=>{
    let fakeuser= new User({
        email: "student@gmail.com",
        username:"surajnair",
        name: "Suraj Nair"
    });
    let registeredUser= await User.register(fakeuser, "password123");
    res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/invites", inviteRouter);
app.use("/friends", friendRouter);
app.use("/recommendations", recommendationRouter);
app.use("/",usersRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found"));
});

//error handling middleware
app.use((err,req,res,next)=>{
    let{statusCode=500, message="something went wrong"}=err;
    res.status(statusCode).render("error.ejs", {message});
});

app.listen(port, (req, res) => {
    console.log("working");
});
