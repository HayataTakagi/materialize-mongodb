const mongoose = require('mongoose'),
utils = require('mongoose-utils/node_modules/mongoose/lib/utils'),
{ PerformanceObserver, performance } = require('perf_hooks'),
co = require('co'),
lib = require('./../lib');
const showLog = lib.showLog,
completeAssign = lib.completeAssign,
getSchemaName = lib.getSchemaName,
getModelName = lib.getModelName,
getMvCollectionName = lib.getMvCollectionName,
getContext = lib.getContext;

mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId,
Mixed = Schema.Types.Mixed;

var preTime, postTime;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  showLog('[Process Start]');

  const schemaSeeds = {
    "personSchema": {
      _id: ObjectId,
      name: String,
      age: Number,
      stories: [{ type: ObjectId, ref: 'Story' }]
    }, "storySchema": {
      _id: ObjectId,
      author: { type: ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: ObjectId, ref: 'Person' }]
    },
  };

  let mvSchemaSeeds = {
    "personSchema": {
      _id: ObjectId,
      name: String,
      age: Number,
      stories: [{ type: ObjectId, ref: 'Story' }]
    }, "storySchema": {
      _id: ObjectId,
      author: { type: ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: ObjectId, ref: 'Person' }]
    },
  };

  const logSchemaSeeds = {
    "userlogSchema": {
      _id: ObjectId,
      elapsed_time: Number,
      options: Mixed,
      collection_name: String,
      method: String,
      query: Mixed,
      populate: [ String ],
      date: {type: Date, default: Date.now},
    }, "mvlogSchema": {
      _id: ObjectId,
      original_model: String,
      original_coll: String,
      populate: [ String ],
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    },
  };

  // オリジナルスキーマの作成
  let schemaList = {};
  schemaBilder(schemaSeeds, schemaList);

  // mvスキーマの定義
  let mvSchemaList = {};
  mvSchemaBilder(schemaSeeds, mvSchemaList);

  // logスキーマの定義
  let logSchemaList = {};
  schemaBilder(logSchemaSeeds, logSchemaList);


  // プリフックの定義 ======================
  Object.keys(schemaList).forEach(function(value) {
    schemaList[value].pre('findOne', function(next) {
      try {
        showLog("Prehook | Start");
        preTime = performance.now();
        var self = this;

        if (self._mongooseOptions.populate == null) {
          // populateがない
          showLog("Prehook | End");
          next();
        } else {
          let modelName = self.model.modelName,
          collectionName = self.mongooseCollection.collectionName,
          populate = Object.keys(self._mongooseOptions.populate);
          // MVログが存在するかでMV化されているか判定する
          logModelList['Mvlog'].countDocuments({original_model: modelName, original_coll: collectionName, populate: populate}, function(err, count) {
            if (err) {console.log(err); return false;}
            if (count === 1) {
              showLog('Exist MV.');
            } else {
              showLog('NOT Exist MV');
              showLog("Prehook | End");
              next();
            }
          })
          .then(res => {
            // クエリをmvに書き換え
            rewriteQueryToMv(self, function(err) {
              next(err);
            });
            showLog("Prehook | End");
            next();
          });
        }
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
        queryLog(elapsedTime, self);
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
  mvModelList = {},
  logModelList = {};
  modelBilder(schemaList, modelList);
  modelBilder(mvSchemaList, mvModelList, true);
  modelBilder(logSchemaList, logModelList);

  // クエリ ============================
  modelList['Story'].
  findOne({ title: 'Sotsuken' }).
  populate(['author', 'fans']).
  exec(function (err, story) {
    if (err) return console.log(err);
    showLog('クエリ結果');
    console.log(story);
  });

  // modelList['Person'].
  // findOne({ name: 'takagi' }).
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
  // createMvDocument('Story', ['author', 'fans'], ['5c04f4b8b99d450ff1d8b4a4','5bfccb8286d08d1336bfd3b0']);
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
      showLog('Finish rewrite Query To Mv');
    } catch (err) {
      callback(err);
    }
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
      addLogSchemaToMv(mvSchemaSeeds[value]);
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

  // mvスキーマseedにlog要素を追加
  function addLogSchemaToMv(obj) {
    obj.log_populate = [ String ];
    obj.log_created_at = {type: Date, default: Date.now};
    obj.log_updated_at = {type: Date, default: Date.now};
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
    let saveObject = {
      elapsed_time: elapsedTime,
      options: obj.options,
      collection_name: obj.mongooseCollection.collection.s.name,
      method: obj.op,
      query: obj._conditions,
    };
    if (obj._mongooseOptions.populate != null) {
      saveObject.populate = Object.keys(obj._mongooseOptions.populate);
    }
    logModelList['Userlog'].insertMany(saveObject, function(err, docs) {
      if (err) return console.log(err);
    });
  }

  // MVの作成
  function createMvDocument(modelName, populate, document_id) {
    let okCount=0, matchedCount=0, modifiedCount=0, upsertedCount=0;
    let collectionName = utils.toCollectionName(modelName);
    modelList[modelName].
    find({ _id: document_id }).
    populate(populate).
    exec(function (err, mvDocuments) {
      if (err) return console.log(err);
      // promise all 後に処理 & co then 後に処理
      const mvSavePromises =  Object.keys(mvDocuments).map((value) => {
        // ログ要素を追加
        mvDocuments[value] = mvDocuments[value].toObject();
        mvDocuments[value].log_populate = populate;
        mvDocuments[value].log_updated_at = Date.now();
        // mvをdbに保存
        mvModelList[modelName].bulkWrite([
          {
            updateOne: {
              filter: {_id: mvDocuments[value]._id},  // idで検索する
              update: mvDocuments[value],  // 保存するobject
              upsert: true,  // 存在しなかった場合新規作成する
              setDefaultsOnInsert: true
            }
          }
        ]).then(res => {
          showLog('createMvDocument | id: ' + mvDocuments[value]._id +
          ',ok:' + res.result.ok + ', matchedCount:' + res.matchedCount +
          ',modifiedCount:' + res.modifiedCount + ', upsertedCount:' +
          res.upsertedCount);
          // MVログを記載
          createMvLog(modelName, collectionName, populate);
        });
      });
      co(function *(){
        Promise.all(mvSavePromises).then(() => {
          // something
        });
      }).then(() => {
        // somthing
      });
    });
  }

  // MVログの記録
  function createMvLog(modelName, collectionName, populate) {
    logModelList['Mvlog'].bulkWrite([
      {
        updateOne: {
          filter: {original_model: modelName, original_coll: collectionName, populate: populate},  // 各値で検索
          update: {updated_at: Date.now()},  // 更新日を更新
          upsert: true,  // 存在しなかった場合新規作成する
          setDefaultsOnInsert: true  // スキーマでdefaultで設定されている値を代入
        }
      }
    ]);
  }

  // MVログの削除
  function removeMvLog(modelName, collectionName, populate) {
    logModelList['Mvlog'].deleteMany({original_model: modelName, original_coll: collectionName, populate: populate}, function(err) {
      if (err) return console.log(err);
    });
  }
});
