// 外部ライブラリのインポート
const mongoose = require('mongoose');
// Mngooseのバッファの設定
mongoose.set('bufferCommands', false);
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
mongoose.set('bufferCommands', false);
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
let removeCollections = async (body, callback) => {
  try {
    showLog('Starting removeCollections', lib.topLog);
    if (body.isRemoveOriginal || body.isRemoveAll) {
      showLog(`Remove (ORIGINAL)-collections of [${Object.keys(modelList)}]`, lib.topLog);
      Object.keys(modelList).forEach( async (value) => {
        // MVのコレクション名をモデル名から取得
        let originalCollectionName = utils.toCollectionName(value);
        // コレクションの削除処理
        await db.dropCollection(originalCollectionName).catch((err) => showLog(`[ERROR] FAIL Remove (ORIGINAL)-collections of ${originalCollectionName}`, lib.lowLog));
      });
    }
    if (body.isRemoveMv || body.isRemoveAll) {
      showLog(`Remove (MV)-collections of [${Object.keys(mvModelList)}]`, lib.topLog);
      Object.keys(mvModelList).forEach( async (value) => {
        // MVのコレクション名をモデル名から取得
        let mvCollectionName = lib.getMvCollectionName(utils.toCollectionName(value));
        // コレクションの削除処理
        await db.dropCollection(mvCollectionName).catch((err) => showLog(`[ERROR] FAIL Remove (MV)-collections of ${mvCollectionName}`, lib.lowLog));
      });
    }
    if (body.isRemoveLog || body.isRemoveAll) {
      showLog(`Remove (LOG)-collections of [${Object.keys(logModelList)}]`, lib.topLog);
      Object.keys(logModelList).forEach( async (value) => {
        // MVのコレクション名をモデル名から取得
        let logCollectionName = utils.toCollectionName(value);
        // コレクションの削除処理
        await db.dropCollection(logCollectionName).catch((err) => showLog(`[ERROR] FAIL Remove (LOG)-collections of ${logCollectionName}`, lib.lowLog));
      });
    }
    if (body.isRemoveMvLog) {
      showLog(`Remove (MVLOG)-collections of [Mvlog]`, lib.topLog);
      // コレクションの削除処理
      await db.dropCollection('mvlogs').catch((err) => showLog(`[ERROR] FAIL Remove (MVLOG)-collections of [Mvlog]`, lib.lowLog));
    }
    if (body.removeMvName) {
      showLog(`HARD Remove (MV)-collections of ${body.removeMvName}`, lib.topLog);
      await db.dropCollection(body.removeMvName).catch((err) => showLog(`[ERROR] FAIL HARD Remove (MV)-collections of ${body.removeMvName}`, lib.lowLog));
    }
    callback(null, {"message": "OK"});
  } catch (e) {
    console.error(e);
  }
};

let aggregateByTestId = async (testId3) => {
  let aggregate1 = await logModelList['Userlog'].aggregate([
    { $group: {
      _id: {ori_model_name: "$ori_model_name", method: "$method", is_rewrited: "$is_rewrited", process_id: "$process_id", test_id: "$test_id"},
      elapsed_time_max: { $max: "$elapsed_time"}, count_query: { $sum: 1}}
    },
    { $group: {
      _id: { ori_model_name: "$_id.ori_model_name", method: "$_id.method", test_id: "$_id.test_id", is_rewrited: "$_id.is_rewrited"},
      total_time: { $sum: "$elapsed_time_max"},
      average_time: { $avg: "$elapsed_time_max"},
      count_post: { $sum: 1},
      count_query: { $sum: "$count_query"},}
    },
    { $sort: { "_id.test_id": 1, "_id.ori_model_name": 1, "_id.method" :1}
    },
  ]).exec();
  let aggregate2 = await logModelList['Userlog'].aggregate([
    { $match: {
      test_id: testId3,}
    },
    { $group: {
      _id: {ori_model_name: "$ori_model_name", method: "$method", is_rewrited: "$is_rewrited", process_id: "$process_id", test_id: "$test_id"},
      elapsed_time_max: { $max: "$elapsed_time"}, count_query: { $sum: 1}}
    },
    { $group: {
      _id: { ori_model_name: "$_id.ori_model_name", method: "$_id.method", test_id: "$_id.test_id"},
      total_time: { $sum: "$elapsed_time_max"},
      average_time: { $avg: "$elapsed_time_max"},
      count_post: { $sum: 1},
      count_query: { $sum: "$count_query"},}
    },
    { $sort: { "_id.test_id": 1, "_id.ori_model_name": 1, "_id.method" :1}
    },
  ]).exec();
  return {aggregate1: aggregate1, aggregate2: aggregate2};
};

module.exports = {
  // テストの集計
  aggregateTestFineOne: aggregateTestFineOne,
  aggregateTestUpdate: aggregateTestUpdate,
  // データベースの削除
  removeCollections: removeCollections,
  // クエリログの集計
  aggregateByTestId: aggregateByTestId,
};
