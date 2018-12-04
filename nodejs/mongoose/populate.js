'use strict';

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

db.on('error', console.error.bind(console, 'connection error:'));



db.once('open', function() {
  // console.log("we're connected!");

  var personSchema = Schema({
    _id: Schema.Types.ObjectId,
    name: String,
    age: Number,
    stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
  });

  var storySchema = Schema({
    author: { type: Schema.Types.ObjectId, ref: 'Person' },
    title: String,
    fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
  });

  var mv_storySchema = Schema({
    author: {
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]},
    title: String,
    fans: [{
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]}]
  })

  // const schema = schemaBuilder();
  // const schemaList[schema.name] = schema;

  storySchema.pre('findOne', function(next) {
    console.log("--------pre_Start--------");
    if (isMaterialized(this)) {
      // モデル情報書き換え
      this.model = MvStory;
      // スキーマ情報書き換え
      this.schema = mv_storySchema;
      // コレクション情報書き換え
      this._collection.collection = db.collection('mvstories');
      // クエリ条件文情報書き換え
      this._conditions.title = "Sotsuken_mv";
      this._mongooseOptions = "";
    }
    console.log("--------pre_End--------");
    next();
  });

  mv_storySchema.pre('findOne', function(next) {
    console.log("--------pre_Start--------");
    console.log(this);
    console.log("--------pre_End--------");
    next();
  });

  var Story = mongoose.model('Story', storySchema);
  var Person = mongoose.model('Person', personSchema);
  var MvStory = mongoose.model('MvStory', mv_storySchema);

  Story.
  findOne({ title: 'Sotsuken' }).
  populate('author').
  exec(function (err, story) {
    if (err) return handleError(err);
    console.log(story);
  });
});

function isMaterialized(query) {
  return false;
}
