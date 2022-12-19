// Server

// import required modules
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

// call express
const app = express();
// use bodyParser
app.use(express.urlencoded({ extended: true }));
// use cookieParser
app.use(cookieParser());
// set-up public folder
app.use(express.static("public"));
// set view engine for ejs
app.set("view engine", "ejs");

// Functions
function escape(htmlStr) {
  return htmlStr.replace("\t", "&nbsp;").replace("\n", "<br>");
}

/////////////////////////////// MongoDB
// connect
let uri = process.env.MONGODB_CONNECTION_URI;
mongoose.connect(
  uri,
  () => console.log("Connected DB succesfully"),
  (e) => console.error(e)
);
// Schema
const blogSchema = mongoose.Schema({
  // _id: Number,
  userName: String,
  emailId: String,
  title: String,
  summary: String,
  content: String,
  date: String,
});
const userSchema = mongoose.Schema({
  _id: String,
  userName: String,
  pwd: String,
});

// Model
const blogModel = mongoose.model("Blog details", blogSchema);
const userModel = mongoose.model("User details", userSchema);

// retrieve current date
let currentDate = new Date();
let currentDateString = currentDate.toLocaleDateString(currentDate, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Variable declarations
let pageTitle = "Journal-Home Page";
let blogId;

//////////////////////////////// start server
// Port number
const portNum = process.env.PORT || 3000
app.listen(portNum, function() {
  console.log(`Server initiated at port number ${portNum}...`)
})

//////////////////////////////// declare home page (root)
app.get("/", async function (req, res) {
  let blogData = await blogModel.find({}).exec();
  blogData = blogData.reverse();
  let userEmailId = req.cookies.emailId;
  pageTitle = "Journal-Home Page";
  curUserInfo = userEmailId
    ? await userModel.findById(userEmailId)
    : userEmailId;
  res.render("home", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    blogData: blogData,
    pageTitle: pageTitle,
    introCard: true,
  });
});

//////////////////////////////// Sign in page
app
  .route("/signIn")
  .get(function (req, res) {
    res.render("signIn");
  })
  .post(async function (req, res) {
    let [emailId, password] = [req.body.email, req.body.password];
    let userCred = await userModel.findById(emailId);
    if (!userCred) res.send(false);
    else if (userCred._id === emailId && userCred.pwd === password) {
      res.cookie("emailId", emailId);
      res.redirect("/");
    } else {
      res.send(false);
    }
  });

//////////////////////////////// Sign up page
app
  .route("/signUp")
  .get(function (req, res) {
    res.render("signup");
  })
  .post(async function (req, res) {
    let newEmail = req.body.email,
      newUserName = req.body.userName,
      newPwd = req.body.password;
    const createUser = new userModel({
      _id: newEmail,
      userName: newUserName,
      pwd: newPwd,
    });
    await createUser.save();
    res.redirect("/signIn");
  });

//////////////////////////////// Logout
app.get("/logout", function (req, res) {
  res.clearCookie("emailId");
  res.redirect("/");
});

//////////////////////////////// new Blog
app
  .route("/newBlog")
  .get(async function (req, res) {
    let userEmailId = req.cookies.emailId;
    let curUserInfo = await userModel.findById(userEmailId);
    const blogData = await blogModel.find({}).exec();
    res.render("newBlog", {
      userInfo: { emailId: userEmailId, info: curUserInfo[userEmailId] },
      pageTitle: pageTitle,
    });
  })
  .post(async function (req, res) {
    let userEmailId = req.cookies.emailId;
    let curUserInfo = await userModel.findById(userEmailId);
    let newEntry = new blogModel({
      userName: curUserInfo.userName,
      emailId: userEmailId,
      title: req.body.topic,
      summary: req.body.summary,
      content: escape(req.body.content),
      date: currentDateString,
    });
    await newEntry.save();
    res.redirect("/");
  });

//////////////////////////////// view my blogs
app.get("/myBlogs", async function (req, res) {
  let userEmailId = req.cookies.emailId;
  let curUserInfo = await userModel.findById(userEmailId);
  const myBlogs = await blogModel.find({ emailId: userEmailId }).exec();
  res.render("home", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    blogData: myBlogs,
    pageTitle: "My Blogs",
    introCard: false,
  });
});

//////////////////////////////// Contact page
app.get("/contact", async function (req, res) {
  let userEmailId = req.cookies.emailId;
  let curUserInfo = await userModel.findById(userEmailId);
  res.render("contact", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    pageTitle: "Contact us",
  });
});

//////////////////////////////// About page
app.get("/about", async function (req, res) {
  let userEmailId = req.cookies.emailId;
  let curUserInfo = await userModel.findById(userEmailId);
  res.render("about", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    pageTitle: "About us",
  });
});

//////////////////////////////// Search
app.get("/searchBlog/:searchQuery", async function (req, res) {
  let userEmailId = req.cookies.emailId;
  const curUserInfo = await userModel.findById(userEmailId);
  let searchQuery = req.params.searchQuery;
  const searchBlogs = await blogModel
    .find({
      $or: [
        { title: { $regex: searchQuery, $options: "i" } },
        { summary: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ],
    })
    .exec();
  res.render("home", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    blogData: searchBlogs,
    pageTitle: "Search results",
    introCard: false,
  });
});

//////////////////////////////// view full blog page
app.get("/viewBlog/:blogId", async function (req, res) {
  let userEmailId = req.cookies.emailId;
  const curUserInfo = await userModel.findById(userEmailId);
  blogId = req.params.blogId;
  let blogIds = await blogModel.find({}, "_id").exec();
  blogIds = blogIds.map((t) => String(t._id));
  let indOfId = blogIds.indexOf(blogId);
  let nextBlogId = indOfId + 1 < blogIds.length ? blogIds[indOfId + 1] : null;
  let prevBlogId = indOfId ? blogIds[indOfId - 1] : null;
  const curBlog = await blogModel.findById(blogId);
  pageTitle = curBlog.title;
  res.render("blogPage", {
    userInfo: { emailId: userEmailId, info: curUserInfo },
    blogId: blogId,
    blogData: curBlog,
    nextBlog: nextBlogId,
    prevBlog: prevBlogId,
    pageTitle: pageTitle,
  });
});
