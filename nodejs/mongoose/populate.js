var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

db.on('error', console.error.bind(console, 'connection error:'));



db.once('open', function() {
  // console.log("we're connected!");

  // const schema = schemaBuilder();
  // const schemaList[schema.name] = schema;

  // スキーマ定義
  // TODO: スキーマ作成の自動化
  const schemaList = {
    "mv_storySchema": Schema({
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
    }),
    "personSchema": Schema({
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    }),
    "storySchema": Schema({
      author: { type: Schema.Types.ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
    }),
  };

  // プリフックの定義
  Object.keys(schemaList).forEach(function(value) {
    schemaList[value].pre('findOne', function(next) {
      try {
        console.log("--------pre_Start--------");
        if (isMaterialized(this)) {
          var self = this;
          rewriteQueryToMv(self, function(err) {
            next(err);
          });
        }
        console.log("--------pre_End--------");
        next();
      } catch (err) {
        next(err);
      }
    });
  });

  // モデル定義
  // TODO: モデル定義の自動化
  var Story = mongoose.model('Story', schemaList['storySchema']);
  var Person = mongoose.model('Person', schemaList['personSchema']);
  var MvStory = mongoose.model('MvStory', schemaList['mv_storySchema']);

  // クエリ作成
  Story.
  findOne({ title: 'Sotsuken' }).
  populate('author').
  exec(function (err, story) {
    if (err) return console.log(err);
    console.log(story);
  });

  // MvStory.
  // findOne({ title: 'Sotsuken_mv' }).
  // exec(function (err, story) {
  //   if (err) return console.log(err);
  //   console.log(story);
  // });

  // MV参照へのクエリ書き換え
  function rewriteQueryToMv(query, callback) {
    try {
      // モデル情報の書き換え
      query.model = MvStory;
      // スキーマ情報書き換え
      query.schema = mv_storySchema;
      // コレクション情報書き換え
      query._collection.collection = db.collection('mvstories');
      // クエリ条件文情報書き換え
      query._conditions.title = "Sotsuken_mv";
      query._mongooseOptions = "";
    } catch (err) {
      callback(err);
    }
  }

  // MV化されているかの判別
  function isMaterialized(query) {
    return true;
  }
});
