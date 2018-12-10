var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
// 外部ライブラリ読み込み
let lib = require('./../lib');
let showLog = lib.showLog,
    completeAssign = lib.completeAssign,
    getSchemaName = lib.getSchemaName,
    getModelName = lib.getModelName;

db.on('error', console.error.bind(console, 'connection error:'));


db.once('open', function() {
showLog('[Process Start]');

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

  let mvSchemaSeeds = {
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

  // オリジナルスキーマの作成
  let schemaList = {};
  schemaBilder(schemaSeeds, schemaList);

  // mvスキーマの定義
  let mvSchemaList = {};
  mvSchemaBilder(schemaSeeds, mvSchemaList);


  // プリフックの定義
  Object.keys(schemaList).forEach(function(value) {
    schemaList[value].pre('findOne', function(next) {
      try {
        showLog("Prehook | Start");
        if (isMaterialized(this)) {
          var self = this;
          rewriteQueryToMv(self, function(err) {
            next(err);
          });
        }
        showLog("Prehook | End");
        next();
      } catch (err) {
        next(err);
      }
    });
  });

  // モデル定義
  let modelList = {},
      mvModelList = {};
  modelBilder(schemaList, modelList);
  modelBilder(mvSchemaList, mvModelList, true)

  // クエリ ============================
  modelList['Story'].
  findOne({ title: 'Sotsuken' }).
  populate('author').
  exec(function (err, story) {
    if (err) return console.log(err);
    console.log(story);
  });

  mvModelList['Story'].
  findOne({ title: 'Sotsuken_mv' }).
  exec(function (err, story) {
    if (err) return console.log(err);
    console.log(story);
  });
  // ================================

  // MV参照へのクエリ書き換え
  function rewriteQueryToMv(query, callback) {
    try {
      // モデル情報の書き換え
      query.model = MvStory;
      // スキーマ情報書き換え
      query.schema = mvSchemaList['storySchema'];
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
    return false;
  }

  // Seedsからスキーマを作成する
  function schemaBilder(seedObjects, schemaObjects) {
    Object.keys(seedObjects).forEach(function(value) {
        schemaObjects[value] = Schema(seedObjects[value]);
    });
  }

  // 与えられたSeedsのMVスキーマを作成
  function mvSchemaBilder(originalSeedObjects, mvSchemaObjects) {
    Object.keys(originalSeedObjects).forEach(function(value) {
      // オリジナルSeedをハードコピー
      // これを使用するとMaximum call stack size exceededが起こる
      // mvSchemaSeeds[value] = completeAssign({}, originalSeedObjects[value]);
      // ref型のスキーマをembed型に変換
      replaceRefSchema(mvSchemaSeeds[value]);
      // Seedからmvスキーマを作成
      mvSchemaObjects[value] = Schema(mvSchemaSeeds[value]);
      showLog('mvSchemaBilder | ' + value + '\'s mv has created.');
    });
  }

  // refがあるスキーマをref先のスキーマに置き換える
  // ref先のrefは置き換えない
  function replaceRefSchema(obj) {
    Object.keys(obj).forEach(function(value) {
      if (typeof obj[value] != "object") {
        // String, Number, _id 等を弾く
        return;
      } else {
        if(obj[value].hasOwnProperty('ref')) {
          // 参照型の場合埋め込み型に書き換える
          // mvschemaを自動生成した際ここでオリジナルのseedが書き換わってしまう
          obj[value] = completeAssign({}, schemaSeeds[getSchemaName(obj[value].ref)]);
        } else {
          // 探索を続ける
          replaceRefSchema(obj[value]);
        }
      }
    });
  }

  // モデル作成
  function modelBilder(schemaObjects, modelObjects, is_mv = false) {
    Object.keys(schemaObjects).forEach(function(value) {
      let modelName = getModelName(value);  // モデル名を生成
      if (is_mv) {
        // mvモデルの場合はモデル名に'Mv'を追加する
        modelObjects[modelName] = mongoose.model('Mv' + modelName, schemaObjects[value]);
      } else {
        modelObjects[modelName] = mongoose.model(modelName, schemaObjects[value]);
      }
      });
  }

  showLog('[Process End]');
});
