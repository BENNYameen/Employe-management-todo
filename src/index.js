const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require('body-parser');
const { collection, Task } = require("./mongo"); // Import both collection and Task
const hbs = require("hbs");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

// Sets up the Express app
const app = express();
const templatePath = path.join(__dirname, "../templates");

// Use express-session middleware
app.use(
  session({
    secret: "your_secret_key_here", // Set a secret for session management
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static('public')); // Serve static content from public folder
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // 10 is the number of salt rounds
    const newUser = await collection.create({
      username: req.body.username,
      password: hashedPassword 
    });
    console.log("Hashed password:", hashedPassword);
    console.log("New user created:", newUser);
    res.render("home");
  } catch (error) {
    console.error("Error occurred during signup:", error);
    res.status(500).send("Error occurred during signup: " + error.message);
  }
});

app.post("/login", passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
}));



// Define the isAuthenticated middleware function
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // User is authenticated, proceed to the next middleware
  } else {
    res.redirect("/login"); // Redirect to the login page if user is not authenticated
  }
};

app.get("/home", isAuthenticated, async (req, res) => {
  try {
    // Fetch tasks only for the current user
    const tasks = await Task.find({ user: req.user._id });
    // Render the home page and pass the tasks to the template
    res.render("home", { tasks, username: req.user.username });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Error fetching tasks: " + error.message);
  }
});

// Remove the duplicate route handler for /home
app.get("/home", async (req, res) => {
  try {
    // Fetch all tasks from the database
    const tasks = await Task.find();
    // Render the home page and pass the tasks to the template
    res.render("home", { tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Error fetching tasks: " + error.message);
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout(); // This will clear the authenticated user's session
  res.redirect("/"); // Redirect the user to the home page or any other desired page after logout
});
// Route to handle adding new tasks
app.post("/home", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    const userId = req.user._id; // Access the authenticated user's _id
    // Create a new task based on the form data
    const newTask = new Task({
      task: req.body.todovalue,// Assuming your input field name is "todovalue"
      user: userId   
    });
    // Save the new task to the database
    await newTask.save();
    // Redirect to the home page to display the updated task list
    res.redirect('/home');
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).send("Error adding task: " + error.message);
  }
});


app.get("/home", async (req, res) => {
  try {
    // Fetch all tasks from the database
    const tasks = await Task.find();
    // Render the home page and pass the tasks to the template
    res.render("home", { tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Error fetching tasks: " + error.message);
  }
});

// Delete task route
app.delete("/home/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    await Task.findByIdAndDelete(taskId);
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    console.error('Error deleting task:', error);
    res.status(500).send('Error deleting task: ' + error.message);
  }
});

// Mark task as completed route
app.put("/home/:taskId/complete", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(taskId, { completed: true }, { new: true });
    res.json(updatedTask);
  } catch (error) {
    console.error('Error marking task as completed:', error);
    res.status(500).send('Error marking task as completed: ' + error.message);
  }
});

// Mark task as incomplete route
app.put("/home/:taskId/incomplete", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(taskId, { completed: false }, { new: true });
    res.json(updatedTask);
  } catch (error) {
    console.error('Error marking task as incomplete:', error);
    res.status(500).send('Error marking task as incomplete: ' + error.message);
  }
});

passport.use(new LocalStrategy(
  async function(username, password, done) {
    try {
      const user = await collection.findOne({ username: username });
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await collection.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! Error: ' + err.message);
});


// Place this middleware at the end of your middleware and route definitions


app.listen(3000, () => {
  console.log("Server started at port 3000");
});
