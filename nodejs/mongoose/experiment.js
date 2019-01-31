// 外部ライブラリのインポート
const mongoose = require('mongoose');
const utils = require('mongoose-utils/node_modules/mongoose/lib/utils');
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();
const env = process.env;

// 自作外部ファイルのインポート
const lib = require('./lib');
const index = require('./index');  // グローバル変数用
const showLog = lib.showLog;
const modelBilder = require('./static/modelBilder');

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// Mngooseのバッファの設定
mongoose.set('bufferCommands', true);
mongoose.connect(`mongodb://${env.DB_IP}/${env.DB_NAME}`, { useNewUrlParser: true });
var db = mongoose.connection;

// testの集計(findOne)
let aggregateTestFineOne = function aggregateTestFineOne(testId, methodName, callback){
  showLog('Starting aggregateTestFineOne', lib.topLog);
  logModelList['Userlog'].aggregate([
    { $match: {
      test_id: testId,
      method: methodName
    }},
    { $group: {
      _id: {model_name: "$model_name", method: "$method", populate: "$populate", is_rewrited: "$is_rewrited"},
      total_time: { $sum: "$elapsed_time"},
      average_time: { $avg: "$elapsed_time"},
      count: { $sum: 1}
    }},
    { $sort: { "_id.model_name": 1, "average_time": -1, "count": -1}}
  ]).
  exec((err, docs) => {
    if (err) callback(err, null);
    callback(null, docs);
  });
};

// testの集計(update)
let aggregateTestUpdate = function aggregateTestUpdate(testId, methodName, callback){
  showLog('Starting aggregateTestUpdate', lib.topLog);
  logModelList['Userlog'].aggregate([
    { $match: {
      test_id: testId,
    }},
    { $group: {
      _id: {method: "$method", process_id: "$process_id"},
      total_time: { $sum: "$elapsed_time"},
      average_time: { $avg: "$elapsed_time"},
      max_time: { $max: "$elapsed_time"},
      count: { $sum: 1},
    }},
    { $group: {
      _id: {method: "$_id.method"},
      total_time: { $sum: "$max_time"},
      average_time: { $avg: "$max_time"},
      query_count: { $sum: 1},
      update_count: { $sum: "$count"},
    }},
    { $sort: { "_id.process_id": 1}}
  ]).
  exec((err, docs) => {
    if (err) callback(err, null);
    callback(null, docs);
  });
};

// データベース削除
let removeCollections = function removeCollections (body, callback) {
  showLog('Starting removeCollections', lib.topLog);
  if (body.isRemoveOriginal || body.isRemoveAll) {
    showLog(`Remove (ORIGINAL)-collections of [${Object.keys(modelList)}]`, lib.topLog);
    Object.keys(modelList).forEach(value => {
      // MVのコレクション名をモデル名から取得
      let originalCollectionName = utils.toCollectionName(value);
      // コレクションの削除処理
      db.dropCollection(originalCollectionName, (err, res) => {
        if (err) showLog(`Error remove (ORIGINAL)-collections of ${value}`, lib.normalLog);
        if (res) showLog(`Success remove (ORIGINAL)-collections of ${value}`, lib.normalLog);
      });
    });
  }
  if (body.isRemoveMv || body.isRemoveAll) {
    showLog(`Remove (MV)-collections of [${Object.keys(mvModelList)}]`, lib.topLog);
    Object.keys(mvModelList).forEach(value => {
      // MVのコレクション名をモデル名から取得
      let mvCollectionName = lib.getMvCollectionName(utils.toCollectionName(value));
      // コレクションの削除処理
      db.dropCollection(mvCollectionName, (err, res) => {
        if (err) showLog(`Error remove (MV)-collections of ${value}`, lib.normalLog);
        if (res) showLog(`Success remove (MV)-collections of ${value}`, lib.normalLog);
      });
    });
  }
  if (body.isRemoveLog || body.isRemoveAll) {
    showLog(`Remove (LOG)-collections of [${Object.keys(logModelList)}]`, lib.topLog);
    Object.keys(logModelList).forEach(value => {
      // MVのコレクション名をモデル名から取得
      let logCollectionName = utils.toCollectionName(value);
      // コレクションの削除処理
      db.dropCollection(logCollectionName, (err, res) => {
        if (err) showLog(`Error remove (LOG)-collections of ${value}`, lib.normalLog);
        if (res) showLog(`Success remove (LOG)-collections of ${value}`, lib.normalLog);
      });
    });
  }
  if (body.isRemoveMvLog) {
    showLog(`Remove (MVLOG)-collections of [Mvlog]`, lib.topLog);
    // コレクションの削除処理
    db.dropCollection('mvlogs', (err, res) => {
      if (err) showLog(`Error remove (MVLOG)-collections`, lib.normalLog);
      if (res) showLog(`Success remove (MVLOG)-collections`, lib.normalLog);
    });
  }
  callback(null, {"message": "OK"});
};

module.exports = {
  // テストの集計
  aggregateTestFineOne: aggregateTestFineOne,
  aggregateTestUpdate: aggregateTestUpdate,
  // データベースの削除
  removeCollections: removeCollections
};
