// DEPENDENCIES
var mongoose = require("mongoose");

// Creating Schema class
var Schema = mongoose.Schema;

// Creating note schema
var NoteSchema = new Schema({
  // note is a string
  note: {
    type: String
  }
});

// Create the Note model with the NoteSchema
var Note = mongoose.model("Note", NoteSchema);

// Export the Note model
module.exports = Note;