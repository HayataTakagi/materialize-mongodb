// 外部ライブラリのインポート
const mongoose = require('mongoose');
const utils = require('mongoose-utils/node_modules/mongoose/lib/utils');
const { PerformanceObserver, performance } = require('perf_hooks');
const co = require('co');
const __ = require('underscore');
require('dotenv').config();
const env = process.env;
// 自作外部ファイルのインポート
const lib = require('./../lib');
const index = require('./index');  // グローバル変数用
const showLog = lib.showLog;
const modelBilder = require('./modelBilder');

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// Mngooseのバッファの設定
mongoose.set('bufferCommands', true);
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;

// 経過時間用
var preTime;

// populate先がschemaで宣言されているか
function checkPopulateAdequacy(modelName, populate) {
  var returnObject = true;
  Object.keys(populate).forEach((value) => {
    if (!schemaSeeds[lib.getSchemaName(modelName)].hasOwnProperty(populate[value])) {
      returnObject = false;
      showLog(`[WANING] Skiped ${modelName}-[${populate.join(',')}] Because ${modelName} has NOT ${populate[value]} in Schema.`, preTime, lib.topLog);
      return;
    }
  });
  return returnObject;
}

// mvを更新する
function updateMvDocuments(original_docs, modelName, query, update_document) {
  // MVコレクションの更新
  // MV更新処理(parent)
  showLog("(PARENT-POPULATE)Start updating MvDocuments" ,preTime, lib.normalLog);
  var doc_ids = Object.keys(original_docs).map((element) => {
    return original_docs[element]._id;
  });
  logModelList['Mvlog'].find({original_model: modelName}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('End updateDocuments' ,preTime, lib.lowLog);
      callback(err, null);
    }
    // そのModel自体がMV化されている際に更新処理を行う
    if (docs.length !== 1) {
      showLog(`updateMvDocuments | (PARENT-POPULATE)NOT Updating ${modelName}'s MV collection BECAUSE ${modelName} doesn't have MV.` ,preTime, lib.normalLog);
    } else {
      showLog(`updateMvDocuments | (PARENT-POPULATE)Updating ${modelName}'s MV collection.`, preTime, lib.normalLog);
      createMvDocument(modelName, docs[0].populate, doc_ids);
    }
  });

  // MV更新処理(children)
  showLog("(CHILDREN-POPULATE)Start updating MvDocuments" ,preTime, lib.normalLog);
  logModelList['Mvlog'].find({populate_model: {$elemMatch:{$eq: modelName}}}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('(CHILDREN-POPULATE)End updateDocuments BECAUSE Error' ,preTime, lib.topLog);
      callback(err, null);
    }
    if (docs.length < 1) {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)NOT Updating populate-${modelName}'s MV collection BECAUSE populate-${modelName} doesn't have MV.` ,preTime, lib.lowLog);
    } else {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)Updating populate-${modelName}'s MV collection.`, preTime, lib.lowLog);
      // そのModelがmv_populateとして埋め込まれている際に更新処理を行う
      let toUpdateMv = {};
      Object.keys(docs).forEach((value) => {
        // populate_modelが更新されているModelと一致した際にpopulateをpushして保存する
        Object.keys(docs[value].populate_model).forEach((key) => {
          if (docs[value].populate_model[key] === modelName) {
            if (!Array.isArray(toUpdateMv[docs[value].original_model])) {
              toUpdateMv[docs[value].original_model] = [];
            }
            toUpdateMv[docs[value].original_model].push(docs[value].populate[key])
          }
        });
      });
      updateChildrenMv(toUpdateMv, doc_ids);
    }
  });
}

// populate先のMV更新
function updateChildrenMv(toUpdateMv, doc_ids) {
  Object.keys(toUpdateMv).forEach(modelName_key => {
    Object.keys(toUpdateMv[modelName_key]).forEach(populate_key => {
      let path = toUpdateMv[modelName_key][populate_key] + '._id';
      let query = { [path]: {$in: doc_ids}};
      mvModelList[modelName_key].find(query, (err, docs) => {
        if (err) return console.log(err);
        if (docs.length < 1) return;
        var to_update_ids = Object.keys(docs).map((element) => {
          return docs[element]._id;
        });
        showLog(`updateChildrenMv | (CHILDREN-POPULATE)Updating populate-MV ${to_update_ids.length} docs in ${modelName_key}`, preTime, lib.lowLog);
        createMvDocument(modelName_key, docs[0].log_populate, to_update_ids);
      });
    });
  });
}

// MVの作成
let createMvDocument = function createMvDocument(modelName, populate, document_id=null) {
  let collectionName = utils.toCollectionName(modelName);
  var query = {};
  if (document_id) {
    query._id = document_id;
    var logLev = lib.normalLog;
  } else {
    var logLev = lib.lowLog;
    showLog(`createMvDocument | Create Mv Collection of ${modelName}`, preTime, lib.normalLog);
  }
  modelList[modelName].
  find(query).
  populate(populate).
  exec(function (err, mvDocuments) {
    if (err) return console.log(err);
    // promise all 後に処理 & co then 後に処理
    const mvSavePromises =  Object.keys(mvDocuments).map((value) => {
      // ログ要素を追加
      mvDocuments[value] = mvDocuments[value].toObject();
      mvDocuments[value].log_populate = populate;
      mvDocuments[value].log_updated_at = new Date();
      // mvをdbに保存
      mvModelList[modelName].replaceOne(
        {_id: mvDocuments[value]._id},  // idで検索する
        mvDocuments[value],  // 保存するobject
        {upsert: true, setDefaultsOnInsert: true},
        (err, res) => {
          showLog(`createMvDocument | modelName:${modelName}, id: ${mvDocuments[value]._id}, ok:${res.ok}, matchedCount:${res.n}, modifiedCount:${res.nModified}, now:${performance.now()}`, preTime, logLev);
        });
      });
      co(function *(){
        Promise.all(mvSavePromises).then(() => {
          // something
        });
      }).then(() => {
        // MVログを記載
        createMvLog(modelName, collectionName, populate);
      });
    });
  };

  // 全てのモデルに対してMV作成
  let createMvDocumentAll = function createMvDocumentAll(callback) {
    preTime = performance.now();
    Object.keys(populateListForModel).forEach(value => {
      createMvDocument(value, populateListForModel[value]);
    });
    callback(null, {"message": "ok"});
  }

  // MV作成判断
  let judgeCreateMv = function judgeCreateMv(callback) {
    preTime = performance.now();
    showLog('Starting judgeCreateMv',preTime, lib.topLog);
    // ユーザーログの読み込み
    logModelList['Userlog'].aggregate([
      { $match: {
        populate: { $exists: true, $ne: [] },
        date: {
          $lt: new Date(),
          $gte: new Date(Date.now() - env.MV_ANALYSIS_PERIOD)},
          is_rewrited: false,
          method: "findOne"
        }},
        { $group: {
          _id: {model_name: "$model_name", method: "$method", populate: "$populate"},
          total_time: { $sum: "$elapsed_time"},
          average_time: { $avg: "$elapsed_time"},
          count: { $sum: 1}
        }},
        { $sort: { "_id.model_name": 1, "average_time": -1, "count": -1}}
      ]).
      exec((err, docs) => {
        // 処理平均時間が超えているクエリに関してコレクション毎に整理する
        var userLogObject = {};
        Object.keys(docs).forEach((value) => {
          if (docs[value].average_time > env.MV_CREATE_AVG) {
            // 処理平均時間が超えているクエリを選択
            if (userLogObject[docs[value]._id.model_name] == null) {
              // コレクション毎にarrayを作成
              userLogObject[docs[value]._id.model_name] = [];
            }
            // コレクションarrayにpush
            userLogObject[docs[value]._id.model_name].push(docs[value]);
          }
        });
        showLog('Finish Cluclation About userLog' , preTime, lib.topLog);
        console.log(userLogObject);
        // 各コレクションの最重要項目のみMV化
        Object.keys(userLogObject).forEach((value) => {
          if (value != "undefined") {
            // 上位からpopulate先が存在するものがあるまでループを実行
            userLogObject[value].some((logObject) => {
              let topUserLog = logObject._id;
              // populateの妥当性をチェック
              if (checkPopulateAdequacy(topUserLog.model_name, topUserLog.populate)) {
                showLog(`Create MV (model_name: ${topUserLog.model_name}, populate: [${topUserLog.populate.join(',')}])`, preTime, lib.topLog);
                createMvDocument(topUserLog.model_name, topUserLog.populate);
                return true;  // ループ文(some)を抜ける
              }
            });
          }
        });
        callback(null, userLogObject);
      });
    };

    // オリジナルコレクション&MV更新処理
    let updateDocuments = function updateDocuments(body ,callback) {
      preTime = performance.now();
      showLog('Starting updateDocuments' ,preTime, lib.topLog);
      if (!body.model_name || !body.query || !body.update_document) {
        callback({"message": "model_name or body.query or update_document are undefine!"}, null);
      } else {
        modelList[body.model_name].
        find(body.query).
        exec(function (err, docs) {
          if (err) {
            console.log(err);
            callback(err, null);
          }
          // オリジナルコレクションの更新
          Object.keys(docs).forEach((value) => {
            // updated_atを更新
            if (!body.update_document.hasOwnProperty('updated_at')) {
              body.update_document.updated_at = new Date();
            }
            // 更新処理
            Object.assign(docs[value], body.update_document);
            docs[value].save((err, doc) => {
              if (err) {
                console.log(err);
                callback(err, null);
              }
              showLog(`updateDocuments | (ORIGINAL)Updated to \n${doc}`, preTime, lib.normalLog);
            });
          });
          if (env.IS_USE_MV != 1) {
            showLog("updateDocuments | \"IS_USE_MV\" is set FALSE", preTime, lib.lowLog);
          } else {
            // オリジナルに関わるMVを更新
            updateMvDocuments(docs, body.model_name, body.query, body.update_document);
          }
          callback(null, docs);
        });
      }
    };

    // testの集計
    let aggregateTest = function aggregateTest(testId, methodName, callback){
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
        console.log(docs);
        callback(null, docs);
      });
    };

    // findOneテスト
    let findOneTest = function findOneTest (body, callback) {
      preTime = performance.now();
      showLog('Starting findOneTest' ,preTime, lib.topLog);
      modelList[body.model_name].
      findOne(body.query).
      populate(body.populate).
      exec((err, doc) => {
        if (err) {
          console.log(err);
          callback(err, null);
        }
        callback(null, doc);
      });
    }

    // データベース削除
    let removeCollections = function removeCollections (body, callback) {
      preTime = performance.now();
      showLog('Starting removeCollections' ,preTime, lib.topLog);
      if (body.isRemoveOriginal || body.isRemoveAll) {
        showLog(`Remove (ORIGINAL)-collections of [${Object.keys(modelList)}]`,preTime, lib.topLog);
        Object.keys(modelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let originalCollectionName = utils.toCollectionName(value);
          // コレクションの削除処理
          db.dropCollection(originalCollectionName, (err, res) => {
            if (err) showLog(`Error remove (ORIGINAL)-collections of ${value}`, preTime, lib.normalLog);
            if (res) showLog(`Success remove (ORIGINAL)-collections of ${value}`, preTime, lib.normalLog);
          });
        });
      }
      if (body.isRemoveMv || body.isRemoveAll) {
        showLog(`Remove (MV)-collections of [${Object.keys(mvModelList)}]`,preTime, lib.topLog);
        Object.keys(mvModelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let mvCollectionName = lib.getMvCollectionName(utils.toCollectionName(value));
          // コレクションの削除処理
          db.dropCollection(mvCollectionName, (err, res) => {
            if (err) showLog(`Error remove (MV)-collections of ${value}`, preTime, lib.normalLog);
            if (res) showLog(`Success remove (MV)-collections of ${value}`, preTime, lib.normalLog);
          });
        });
      }
      if (body.isRemoveLog || body.isRemoveAll) {
        showLog(`Remove (LOG)-collections of [${Object.keys(logModelList)}]`,preTime, lib.topLog);
        Object.keys(logModelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let logCollectionName = utils.toCollectionName(value);
          // コレクションの削除処理
          db.dropCollection(logCollectionName, (err, res) => {
            if (err) showLog(`Error remove (LOG)-collections of ${value}`, preTime, lib.normalLog);
            if (res) showLog(`Success remove (LOG)-collections of ${value}`, preTime, lib.normalLog);
          });
        });
      }
      callback(null, {"message": "OK"});
    };

    module.exports = {
      // モデル本体
      modelList: modelList,
      // MVの作成
      createMvDocument: createMvDocument,
      // すべてのモデルに対してMV作成
      createMvDocumentAll: createMvDocumentAll,
      // MV作成判断
      judgeCreateMv: judgeCreateMv,
      // オリジナル&MV更新処理
      updateDocuments: updateDocuments,
      // populateを検知したモデル
      populateModelList: populateModelList,
      // populate先をモデル別にリスト
      populateListForModel: populateListForModel,
      // テストの集計
      aggregateTest: aggregateTest,
      // findOneテスト
      findOneTest: findOneTest,
      // データベースの削除
      removeCollections: removeCollections
    };
