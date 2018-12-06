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
  // const schemaList = {
  //   "personSchema": Schema({
  //     _id: Schema.Types.ObjectId,
  //     name: String,
  //     age: Number,
  //     stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
  //   }),
  //   "storySchema": Schema({
  //     _id: Schema.Types.ObjectId,
  //     author: { type: Schema.Types.ObjectId, ref: 'Person' },
  //     title: String,
  //     fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
  //   }),
  // };

  const schemaSeeds = {
    "personSchema": {
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    },"storySchema": {
      _id: Schema.Types.ObjectId,
      author: { type: Schema.Types.ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
    },
  };

  const schemaList = {
    "personSchema": Schema(schemaSeeds['personSchema']),
    "storySchema": Schema(schemaSeeds['personSchema'])
  };




  // mvスキーマの定義
  let mvschemaList = [];
  Object.keys(schemaList).forEach(function(value) {
    mvschemaList[value] = mvSchemaBilder(schemaList[value]);
  });
  let mvschemaList2 = {
    "storySchema": Schema({
      _id: Schema.Types.ObjectId,
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
  };
  // let testPersonSchema = Schema(mvschemaList['storySchema'].obj);
  // console.log(mvschemaList['storySchema'].obj);

  // console.log('[START]LIST!!!!!');
  // console.log(mvschemaList['storySchema']);
  // console.log('[END]LIST!!!!!');
  // console.log('[START]LIST222!!!!!');
  // console.log(mvschemaList2['storySchema']);
  // console.log('[END]LIST222!!!!!');
  // console.log('[START]LIST333!!!!!');
  // console.log(testPersonSchema);
  // console.log('[END]LIST333!!!!!');
  // プリフックの定義
  // Object.keys(schemaList).forEach(function(value) {
  //   schemaList[value].pre('findOne', function(next) {
  //     try {
  //       console.log("--------pre_Start--------");
  //       if (isMaterialized(this)) {
  //         var self = this;
  //         rewriteQueryToMv(self, function(err) {
  //           next(err);
  //         });
  //       }
  //       console.log("--------pre_End--------");
  //       next();
  //     } catch (err) {
  //       next(err);
  //     }
  //   });
  // });

  // モデル定義
  // TODO: モデル定義の自動化
  var Story = mongoose.model('Story', schemaList['storySchema']);
  var Person = mongoose.model('Person', schemaList['personSchema']);
  var MvStory = mongoose.model('MvStory', mvschemaList['storySchema']);

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
  // console.log('[Start]===mvpersonSchema===');
  // console.log(mvschemaList['personSchema']);
  // console.log('[End]===mvpersonSchema===');

  // MV参照へのクエリ書き換え
  function rewriteQueryToMv(query, callback) {
    try {
      // モデル情報の書き換え
      query.model = MvStory;
      // スキーマ情報書き換え
      query.schema = mvschemaList['storySchema'];
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

  // 与えられたスキーマのMVスキーマを作成
  function mvSchemaBilder(schema) {
    replaceRefSchema(schema.obj);
    return schema;
  }

  // refがあるスキーマをref先のスキーマに置き換える
  // ref先のrefは置き換えない
  function replaceRefSchema(obj) {
    Object.keys(obj).forEach(function(value, key) {
      if (typeof obj[value] != "object") {
        // String, Number, _id 等を弾く
        return;
      } else {
        if(obj[value].hasOwnProperty('ref')) {
          // 参照型の場合埋め込み型に書き換える
          obj[value] = schemaList[getSchemaName(obj[value].ref)].obj;
        } else {
          // 探索を続ける
          replaceRefSchema(obj[value]);
        }
      }
    });
  }

  // モデル名からスキーマ名を取得
  function getSchemaName(model_name) {
    return model_name.toLowerCase() + 'Schema';
  }
});
