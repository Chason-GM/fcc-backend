const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()


const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const UserSchema = mongoose.Schema({
  username: {type: String, required: true},
})

const ExerciseSchema = mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  description: {type: String, required: true},
  duration: {type: Number, required: true}, // Minutes
  date: Date
})

const User = mongoose.model('User', UserSchema)
const Exercise = mongoose.model('Exercise', ExerciseSchema)

app.post("/api/users", async (req, res) => {
  try {
    const user = new User({
      username: req.body.username
    })
    await user.save()
    res.json({username: user.username, _id: user._id})
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(err.stack)
  }
}) 
app.post("/api/users/:_id/exercises", async (req, res) => {
    // try id
    try {
      const { _id } = req.params
      const { description, duration, date } = req.body

      let user = await User.findById(_id)
      const exercise = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? date : new Date()
      })
      await exercise.save()
      res.json({
        _id: user._id,
        username: user.username,
        date: new Date(exercise.date).toDateString(),
        duration: exercise.duration,
        description: exercise.description
      })
    } catch (err) {
      res.setHeader('Content-Type', 'text/plain');
      res.send(err.stack)
    }
}) 
app.get('/api/users', async (req, res) => {
  const users = await User.find()
  res.json(users)
})

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query;
    const user = await User.findById(_id)
    const userId = user._id
    let query = {user_id : userId}

    if (from || to) { // if from or to exists
      query.date = {}
      if (!from) {
        query.date.$gte = new Date(0);
      } else{
        query.date.$gte = new Date(from);
      }

      if (!to) {
        query.date.$lte = new Date();
      } else {
        query.date.$lte = new Date(to);
      }
    }
    const exercises = await Exercise.find(query)
      .sort({date: 1}) //ascending
      .limit(limit ? parseInt(limit) : undefined)

    res.json({
      _id: userId,
      username: user.username,
      count: exercises.length,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString(),
      }))
    })
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(err.stack)
  }
})
app.use("/", (req, res) => {
  res.send('[object Object]')
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
