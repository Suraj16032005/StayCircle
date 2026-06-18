const User=require("../models/user.js");
const Invite=require("../models/invite.js");

module.exports.signUp=async (req,res,next)=>{
    try{
        let {email, username, password, name, inviteCode}= req.body;
        
        // Find invite code
        const invite = await Invite.findOne({ code: inviteCode ? inviteCode.trim().toUpperCase() : "" });
        if (!invite || invite.used) {
            req.flash("error", "Invalid invite code");
            return res.redirect("/signup");
        }

        let newUser= new User({
            email: email,
            username: username,
            name: name
        });
        let registeredUser= await User.register(newUser, password);
        
        // Update invite
        invite.used = true;
        invite.usedBy = registeredUser._id;
        await invite.save();

        console.log(registeredUser);
        req.login(registeredUser, (err)=> {
            if (err) {
                return next(err); 
            } 
            req.flash("success","welcome to travel website!");
            let redirectUrl = res.locals.redirectUrl || "/listings";
            res.redirect(redirectUrl);
        });
    } catch(e){
      req.flash("error", e.message);
      res.redirect("/signup");
    }
};


module.exports.renderSignUpForm= (req,res)=>{
    res.render("users/signup.ejs");
};

module.exports.renderLoginPage=(req,res)=>{
    res.render("users/login.ejs");
}

module.exports.logout=(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","logout done successfully");
        res.redirect("/listings");
    });
};

module.exports.login = (req,res)=>{
  req.flash("success","you are logged in!");
  let redirectUrl=res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};