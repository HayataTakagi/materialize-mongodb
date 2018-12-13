var mongoose = require('mongoose');
const { PerformanceObserver, performance } = require('perf_hooks');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });

var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
// 外部ライブラリ読み込み
let lib = require('./../lib');
let showLog = lib.showLog,
    completeAssign = lib.completeAssign,
    getSchemaName = lib.getSchemaName,
    getModelName = lib.getModelName,
    getMvCollectionName = lib.getMvCollectionName,
    getContext = lib.getContext;
var preTime, postTime;

// const is_showThisInPreHook = true;
const is_showThisInPreHook = false;

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


  // プリフックの定義 ======================
  Object.keys(schemaList).forEach(function(value) {
    schemaList[value].pre('findOne', function(next) {
      try {
        showLog("Prehook | Start");
        if (is_showThisInPreHook) {
          console.log(this.mongooseCollection.collectionName);
        }
        preTime = performance.now();
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

  // ポストフックの定義 ======================
  Object.keys(schemaList).forEach(function(value) {
    schemaList[value].post('findOne', function(doc, next) {
      try {
        showLog("Posthook | Start");
        // 処理時間の計算
        postTime = performance.now();
        let elapsedTime = (postTime - preTime);
        // クエリログの表示
        let self = this;
        queryLog(elapsedTime, self)
        showLog("Posthook | End");
        next();
      } catch (err) {
        next(err);
      }
    });
  });
  // ==================================

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
    showLog('クエリ結果');
    console.log(story);
  });

  // modelList['Person'].
  // findOne({ name: 'takagi' }, 'age').
  // limit(1).
  // exec(function (err, person) {
  //   if (err) return console.log(err);
  //   showLog('クエリ結果');
  //   console.log(person);
  // });

  // mvModelList['Story'].
  // findOne({ title: 'Sotsuken_mv' }).
  // exec(function (err, story) {
  //   if (err) return console.log(err);
  //   showLog('クエリ結果');
  //   console.log(story);
  // });
  // ================================

  // MV参照へのクエリ書き換え
  function rewriteQueryToMv(query, callback) {
    try {
      let modelName = query.model.modelName,
          collectionName = query.mongooseCollection.collectionName;
      // モデル情報の書き換え
      query.model = mvModelList[modelName];
      // スキーマ情報書き換え
      query.schema = mvSchemaList[getSchemaName(modelName)];
      // コレクション情報書き換え
      query._collection.collection = db.collection(getMvCollectionName(collectionName));
      // populateオプションの除去
      query._mongooseOptions = "";
      // クエリ条件文情報書き換え
      // query._conditions.title = "Sotsuken_mv";
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

  // クエリログの取得
  function queryLog(elapsedTime, obj) {
    showLog('クエリログ');
    console.log(elapsedTime + 'ms');
    console.log(obj.options);  // option
    console.log(obj.mongooseCollection.collection.s.name);  // collectionName
    console.log(obj.op);  // method
    console.log(obj._conditions);  // query
    if (obj._mongooseOptions.populate != null) {
      console.log(Object.keys(obj._mongooseOptions.populate));  // populate
    }
  }

  showLog('[Process End]');
});
