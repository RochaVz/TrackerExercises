const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose");
const bodyParser = require("body-parser");


const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: String,
});

const logSchema = new mongoose.Schema(
  {
    username: String,
    count: Number,
    userId: String,
    log: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
  }
);

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);
const Log = mongoose.model("Log", logSchema);

const initDBConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.")
  } catch (error) {
    console.log(error);
  }
}

initDBConnection();

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/users", (req, res) => {

  const username = req.body.username;

  const newUser = new User({ username });
  newUser.save().then(() => console.log(`Created new user ${newUser}`));
  res.status(200).send({ username: newUser.username, _id: newUser._id });

})

app.get("/api/users", (req, res) => {
  User.find({}).then((users) => {
    res.status(200).send(users);
  })
})


app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
  try {
    const user = await User.findById(userId);

    const newExercise = new Exercise({
      userId,
      description,
      duration,
      date
    });

    const exercise = await newExercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: date
    })

  } catch (error) {

  }
});


app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const exerciseQuery = {};

  if (from && !to) {
    exerciseQuery.date = { $gte: new Date(from.toString()).toDateString() };
  }

  if (to && !from) {
    exerciseQuery.date = { $lte: new Date(to.toString()).toDateString() };
  }

  if (from && to) {
    exerciseQuery.date = { $gte: new Date(from.toString()).toDateString(), $lte: new Date(to.toString()).toDateString() };
  }

  try {
    const user = await User.findById(userId);

    const userExercises = await Exercise.find({ userId }, exerciseQuery)
      .select({ _id: 0, description: 1, duration: 1, date: 1 })
      .limit(limit ? parseInt(limit) : undefined);

    const newLog = new Log({
      username: user.username,
      count: userExercises.length,
      userId: userId,
      log: userExercises
    });

    const log = await newLog.save();

    res.send(log);

  } catch (error) {
    console.log(error)
  }
})

//api/users/65ea0dddc0eabe8688d9a923/logs


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

