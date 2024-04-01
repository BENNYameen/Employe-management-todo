const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/test", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Increase the timeout value
    socketTimeoutMS: 45000, // Increase the socket timeout
  })
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err);
  });

const loginSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
const Login = mongoose.model("Login", loginSchema); // Rename model to "Login" for clarity
const taskSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'collection', // Reference to the User model
    required: true
  },
  completed: {
    type: Boolean,
    default: false, // Default value is false, indicating task is not completed
  },
});

const Task = mongoose.model("task", taskSchema);

const collection = mongoose.model("Collection1", loginSchema);

module.exports = { collection, Task };