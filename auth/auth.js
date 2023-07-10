const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/user.model");
const asyncHandler = require("express-async-handler");

// Cookie
const createSendToken = (payload, res) => {
  const token = jwt.sign(payload, process.env.JWTPRIVATEKEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const date = new Date();
  const cookieOptions = {
    expires: new Date(
      date.setDate(date.getDate() + +process.env.JWT_EXPIRES_IN.split("d")[0])
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);
  return token;
};

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      username,
      email,
    } = req.body;

    const emailExists = await User.findOne({ email: email });
    if (emailExists) return res.status(400).send("Email already exists");

    const usernameExists = await User.findOne({ username: username });
    if (usernameExists) return res.status(400).send("Username already exists");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    savedUser.password = undefined;
    const token = createSendToken({ user: user._id }, res);
 
    res.cookie("auth-token", token);
    console.log(token) 
    createSendToken({ _id: user._id }, res);
    res.send(user)
    console.log("User has been created");
  } catch (error) {
    if (error.isJoi === true) {
      return res.status(400).send(error.details[0].message);
    }
    res.status(400).send({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).send("Please enter a username and password");
    const user = await User.findOne({ username }).select("+password");
    if (!user) return res.status(400).send("User does not exist");
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .json({ message: "Incorrect username or password" });

        const token = jwt.sign({ _id: user._id }, process.env.JWTPRIVATEKEY);
    res.cookie("auth-token", token);
    
    createSendToken({ _id: user._id }, res);    
    const { name } = user

    res.send({
      username: user.username, 
      name: name,
      id: user._id,
      email: user.email,
      token: token
    })
    
  } catch (error) {
    if (error.isJoi === true) error.status = 422;
    console.log(error);
    res.status(400).send({ error: error.message });
  }
});

const sendUser = (user, res) => {
  if (user) {
    return res.json({
      isLoggedIn: true,
      user,
    });
  }
  res.json({
    isLoggedIn: false,
    user: null,
  });
};

const isUserLoggedIn = asyncHandler(async (req, res, next) => {
  const token = req.cookies["auth-token"];
  if (!token) return sendUser(null, res);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
  } catch (error) {
    res.cookie("jwt", "", { maxAge: 0 });
    return sendUser(null, res);
  }
  const user = await User.findById(decoded._id).select(
    "-accountActive -__v -visibleBy"
  );

  req.user = user;
  next()
});

router.get("/is-user-logged-in", isUserLoggedIn);

router.post("/loggout", (req, res) => {
  res.clearCookie("jwt");
  res.sendStatus(200);
});

router.post("/changepassword", async (req, res) => {
  try {
    const { username, password, newPassword } = req.body;
    if (!username || !password || !newPassword)
      return res.status(400).send("Please enter a username and password");
    const user = await User.findOne({ username }).select("+password");
    const name = await User.findOne({ username }).select("name");
    console.log(name)
    if (!user) return res.status(400).send("User does not exist");
    // checking the password given
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(400)
        .json({ message: "Incorrect username or password" });
        if (password === newPassword) {
          return res.status(400).send("New password cannot be the same as the old password");
        }else{
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        }
        res.clearCookie("jwt");

        await user.save();
        res.send("Password has been changed")
  } catch (error) {
    if (error.isJoi === true) error.status = 422;
    console.log(error);
  }
});

router.post("/forgotpassword", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword)
      return res.status(400).send("Please enter a username and password");
    const user = await User.findOne({ username }).select("+password");
    const name = await User.findOne({ username }).select("name");
    console.log(name)
    if (!user) return res.status(400).send("User does not exist");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;

        await user.save();
        res.send("Password has been changed")
  } catch (error) {
    if (error.isJoi === true) error.status = 422;
    console.log(error);
  }
}); 
  
module.exports = { router, isUserLoggedIn }; 