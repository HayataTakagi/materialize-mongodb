// 外部ライブラリのインポート
const mongoose = require('mongoose');
const { PerformanceObserver, performance } = require('perf_hooks');
const __ = require('underscore');
require('dotenv').config();
const env = process.env;
// 自作外部ファイルのインポート
const lib = require('./../lib');  // グローバル変数用
const index = require('./../index');
const schemaIndex = require('./schemaIndex');
const showLog = lib.showLog;

// Mngooseのバッファの設定
mongoose.set('bufferCommands', true);
mongoose.connect(`mongodb://${env.DB_IP}/${env.DB_NAME}`, { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId,
Mixed = Schema.Types.Mixed;

// 経過時間用
var preEndTime, postTime;
global.preTimeGlobal = performance.now();
let startTimeList = [];
// populate先モデルリスト
var populateModelList = {};
// モデル別populate先リスト
var populateListForModel = {};

// スキーマシードの定義
const schemaSeeds = schemaIndex.seedObjects[env.SCHEMA_NAME];
const mvSchemaSeeds = schemaIndex.mvSeedObjects[env.SCHEMA_NAME];
const logSchemaSeeds = schemaIndex.logSeedObjects;

// オリジナルスキーマの作成
let schemaList = {};
schemaBilder(schemaSeeds, schemaList);
createPopulateListForModel(schemaSeeds);

// mvスキーマの定義
let mvSchemaList = {};
mvSchemaBilder(mvSchemaList);

// logスキーマの定義
let logSchemaList = {};
schemaBilder(logSchemaSeeds, logSchemaList);


// プリフックの定義 ======================
Object.keys(schemaList).forEach(function(value) {
  schemaList[value].pre('findOne', function(next) {
    try {
      showLog("Prehook | Start", lib.wasteLog);
      var self = this;
      // クエリログの為に書き換えられる可能性のあるパラメーターを保存
      self.modelName_ori = self.model.modelName;
      if (self._mongooseOptions.populate != null) {
        self._mongooseOptions_ori = self._mongooseOptions;
      }

      if (env.IS_USE_MV != 1) {
        showLog("Prehook | \"IS_USE_MV\" is set FALSE", lib.normalLog);
        preEndTime = performance.now();  // クエリログ用
        next();
      } else {
        if (self._mongooseOptions.populate == null) {
          // populateがない
          showLog("Prehook | End", lib.wasteLog);
          preEndTime = performance.now();  // クエリログ用
          next();
        } else {

          let modelName = self.model.modelName,
          collectionName = self.mongooseCollection.collectionName,
          populate = Object.keys(self._mongooseOptions.populate);
          // MVログが存在するかでMV化されているか判定する
          logModelList['Mvlog'].countDocuments({original_model: modelName, original_coll: collectionName, populate: populate}, function(err, count) {
            if (err) return console.log(err);
            if (count === 1) {
              showLog('Exist MV.', lib.lowLog);
              // クエリをmvに書き換え
              rewriteQueryToMv(self, function(err) {
                preEndTime = performance.now();  // クエリログ用
                next(err);
              });
              showLog("Prehook | End", lib.wasteLog);
              preEndTime = performance.now();  // クエリログ用
              next();
            } else {
              showLog('NOT Exist MV', lib.lowLog);
              showLog("Prehook | End", lib.wasteLog);
              preEndTime = performance.now();  // クエリログ用
              next();
            }
          });
        }
      }
    } catch (err) {
      preEndTime = performance.now();  // クエリログ用
      next(err);
    }
  });
});

// ポストフックの定義 ======================
Object.keys(schemaList).forEach(function(value) {
  schemaList[value].post('findOne', function(doc, next) {
    try {
      showLog("Posthook | Start", lib.wasteLog);
      // 処理時間の計算
      postTime = performance.now();
      let elapsedTime = (postTime - preEndTime);
      showLog(`This Query's elapsedTime is [[ ${elapsedTime} ]]ms` , lib.normalLog);
      // クエリログの保存
      let self = this;
      queryLogFindOne(elapsedTime, self);
      showLog("Posthook | End", lib.wasteLog);
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

// Database接続確認
db.on('error', console.error.bind(console, 'connection error:'));
showLog('[Process Start]', lib.topLog);

// クエリログの保存(findOne)
function queryLogFindOne(elapsedTime, obj) {
  showLog('Writing Query Log', lib.wasteLog);
  let saveObject = {
    elapsed_time: elapsedTime,
    options: obj.options,
    collection_name: obj.mongooseCollection.collection.s.name,
    model_name: obj.modelName_ori,
    method: obj.op,
  };
  // Mongoの禁止語の"$"を"_DOLL_"に置換
  if (obj._conditions) {
    let queryStr = String(JSON.stringify(obj._conditions));
    saveObject.query = queryStr.replace(/\$/g, '_DOLL_');
  }
  if (obj.hasOwnProperty("_mongooseOptions_ori")) {
    saveObject.populate = Object.keys(obj._mongooseOptions_ori.populate);
  }
  if (global.testId) {
    saveObject.test_id = global.testId;
  }
  // クエリが書き換えられたかどうか
  saveObject.is_rewrited = obj._isRewritedQuery ? 1 : 0;
  // ログをDBに書き込み
  logModelList['Userlog'].insertMany(saveObject, function(err, docs) {
    if (err) return console.log(err);
  });
}

// クエリログの保存(update)
let queryLogUpdate = function queryLogUpdate(processId, modelName) {
  showLog('Writing Query Log', lib.wasteLog);
  let elapsedTime = performance.now() - startTimeList[processId];
  let saveObject = {
    elapsed_time: elapsedTime,
    model_name: modelName,
    method: "update",
  };
  // Mongoの禁止語の"$"を"_DOLL_"に置換
  if (global.query) {
    let queryStr = String(JSON.stringify(global.query));
    saveObject.query = queryStr.replace(/\$/g, '_DOLL_');
  }
  if (global.testId) {
    saveObject.test_id = global.testId;
  }
  // ログをDBに書き込み
  logModelList['Userlog'].insertMany(saveObject, function(err, docs) {
    if (err) return console.log(err);
  });
};

// MV参照へのクエリ書き換え
function rewriteQueryToMv(query, callback) {
  try {
    let modelName = query.model.modelName,
    collectionName = query.mongooseCollection.collectionName;
    // モデル情報の書き換え
    query.model = mvModelList[modelName];
    // スキーマ情報書き換え
    query.schema = mvSchemaList[lib.getSchemaName(modelName)];
    // コレクション情報書き換え
    query._collection.collection = db.collection(lib.getMvCollectionName(collectionName));
    // populateオプションの除去
    query._mongooseOptions = "";
    // クエリ書き換えのフラグを立てる
    query._isRewritedQuery = true;
    showLog('Finish rewrite Query To Mv', lib.normalLog);
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
function mvSchemaBilder(mvSchemaObjects) {
  Object.keys(mvSchemaSeeds).forEach(function(value) {
    // ref型のスキーマをembed型に変換
    replaceRefSchema(mvSchemaSeeds[value], '', lib.getModelName(value));
    // MVにログを埋め込む
    addLogSchemaToMv(mvSchemaSeeds[value]);
    // Seedからmvスキーマを作成
    mvSchemaObjects[value] = Schema(mvSchemaSeeds[value]);
    showLog('mvSchemaBilder | ' + value + '\'s mv has created.', lib.topLog);
  });
}

// populateListForModel用配列を準備
function createPopulateListForModel(SeedObjects) {
  Object.keys(SeedObjects).forEach(function(value) {
    // populateListForModel用配列を準備
    populateListForModel[lib.getModelName(value)] = [];
  });
}

// refがあるスキーマをref先のスキーマに置き換える
// ref先のrefは置き換えない
function replaceRefSchema(obj, parent='', root) {
  Object.keys(obj).forEach(function(value) {

    if (typeof obj[value] != "object") {
      // String, Number, _id 等を弾く
      return;
    } else {
      if(obj[value].hasOwnProperty('ref')) {
        // 参照型の場合埋め込み型に書き換える
        // populate先モデルリストとモデル別populateリストに保存
        if (Array.isArray(obj)) {
          populateModelList[parent] = obj[value].ref;
          populateListForModel[root].push(parent);
        } else {
          let current = parent === '' ? value : `${parent}.${value}`;
          populateModelList[current] = obj[value].ref;
          populateListForModel[root].push(current);
        }
        // mvschemaを自動生成した際ここでオリジナルのseedが書き換わってしまう
        obj[value] = lib.completeAssign({}, schemaSeeds[lib.getSchemaName(obj[value].ref)]);
      } else {
        // 探索を続ける
        let next = parent === '' ? value : `${parent}.${value}`;
        replaceRefSchema(obj[value], next, root);
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
    let modelName = lib.getModelName(value);  // モデル名を生成
    if (is_mv) {
      // mvモデルの場合はモデル名に'Mv'を追加する
      modelObjects[modelName] = mongoose.model('Mv' + modelName, schemaObjects[value]);
    } else {
      modelObjects[modelName] = mongoose.model(modelName, schemaObjects[value]);
    }
  });
}

module.exports = {
  // List
  // モデル本体
  modelList: modelList,
  // MVモデル本体
  mvModelList: mvModelList,
  // Logモデル本体
  logModelList: logModelList,
  // populateを検知したモデル
  populateModelList: populateModelList,
  // populate先をモデル別にリスト
  populateListForModel: populateListForModel,
  // update経過時間計算用
  startTimeList: startTimeList,
  // Method
  // update用クエリログ記録用
  queryLogUpdate: queryLogUpdate,
};
