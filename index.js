require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());
const mongoose = require('mongoose')
const dns = require('dns');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const counterSchema = mongoose.Schema({
  seq: { type: Number, default: 1 }
})
const Counter = mongoose.model('Counter', counterSchema)

const urlSchema = mongoose.Schema({
  originalUrl: {type: String, required: true},
  shortenUrl: {type: Number, required: true, unique: true }
})

const Url = mongoose.model('Url', urlSchema)
const getNextSeq = async () => {
  const counter = await Counter.findOneAndUpdate(
    {},
    {$inc: { seq : 1 }}, // Increment seq by 1
    {new: true, upsert: true}   // Return the updated document, or create it if it doesnt exist
  )
  return counter.seq
} 
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


app.post('/api/shorturl', (req, res) => {
  const originalUrl  = req.body.url
  try {
    const validUrl = new URL(originalUrl)
    const hostname = validUrl.hostname
    dns.lookup(hostname, async (err) => {
      if (err) {
        return res.json({"error":"Invalid URL"})
      }

      let data = await Url.findOne({originalUrl}) // find data using originalUrl given by user
      if (!data) {
        // if doesnt exist gen next short
        const shortenUrl = await getNextSeq()
        // reassign data
        data = new Url({originalUrl, shortenUrl})
        await data.save()
      }
      res.json({original_url: data.originalUrl, short_url: data.shortenUrl})
    })
  } catch (err) {
    return res.json({"error":"Invalid URL"})
  }
})

app.get('/api/shorturl/:code', async (req, res) => {
  if (isNaN(req.params.code)) {
    return res.json({"error":"Wrong format"})
  }
  let data = await Url.findOne({shortenUrl: req.params.code})
  if (!data) {
    return res.json({"error":"No short URL found for the given input"})
  }
  res.redirect(data.originalUrl)
})




app.use('/', (req, res)=>{
  res.send('Not found')
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
