// DEPENDENCIES
var express = require("express");
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");
var logger = require("morgan");
var methodOverride = require("method-override");
var mongoose = require("mongoose");
// Models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Setting mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


/*******************************************/
// SETTING UP THE EXPRESS APP
var app = express();
var PORT = process.env.PORT || 3000;

// Setting up the Express app with morgan
app.use(logger("dev"));

// Setting up the Express app to handle data parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

// Serving static content for the app from the "public" directory in the app directory
app.use(express.static(process.cwd() + "/public"));

// Overriding with POST having ?_method=DELETE
app.use(methodOverride("_method"));


/*******************************************/
// SETTING UP HANDLEBARS
app.engine("handlebars", exphbs({
    defaultLayout: "main"
}));
app.set("view engine", "handlebars");


/*******************************************/
// CONFIGURING DB
// Database configuration with mongoose
mongoose.connect("mongodb://heroku_96srcnwp:k9vqebtelagn88jf1lbiba95c@ds155091.mlab.com:55091/heroku_96srcnwp");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


/*******************************************/
// ROUTES
// A GET request to scrape the NYT website
app.get("/scrape", function(req, res) {
  // Grabbing the body of the html with request
  request("https://www.nytimes.com/", function(error, response, html) {
    // Loading that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // Grabbing every h2 within an article tag
    $("article h2").each(function(i, element) {

      // Saving an empty result object
      var result = {};

      // Adding the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text().trim();
      result.link = $(this).children("a").attr("href");

      // Using the Article model, creating a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(result);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log(doc);
        }
      });

    });
  });
  // Telling the browser that we finished scraping the text
  res.redirect("/");
});

// This will get the articles we scraped from the mongoDB
app.get("/", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser
    else {
      var articleObj = {
        article: doc
      };
      res.render("index", articleObj);
    }
  }).
  sort({ title: 1 }).
  limit(15);
});

app.put("/:id", function(req, res) {
  // Use the article id to find and update it's status to "saved"
  Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": req.body.saved })
  // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      else {
        // Or send the document to the browser
        console.log(doc);
      }
    });
    res.redirect("/");
});

app.get("/saved", function(req, res) {
  // Grab every doc in the Articles array that is saved
  Article.find({ saved: true }, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser
    else {
      var articleObj = {
        article: doc
      };
      res.render("saved", articleObj);
    }
  });
});

app.put("/delete/:id", function(req, res) {
  // Delete an article based on it's ObjectId
  Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": req.body.saved })
  // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      else {
        // Or send the document to the browser
        console.log(doc);
      }
    });
  res.redirect("/saved");
});

// Grab an article by it's ObjectId
app.get("/saved/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // Populating all of the notes associated with it
  .populate("note")
  // Executing the query
  .exec(function(error, doc) {
    // Logging any errors
    if (error) {
      console.log(error);
    }
    // Sending the doc to the browser as a JSON object
    else {
      res.json(doc);
    }
  });
});

// Create a new note or replace an existing note
app.post("/saved/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});

app.get("/saved/:id", function(req, res) {
  // Grab every doc in the Articles array that is saved
  Note.find({ saved: true }, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser
    else {
      var articleObj = {
        article: doc
      };
      res.render("saved", articleObj);
    }
  });
});

// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port " + PORT);
});