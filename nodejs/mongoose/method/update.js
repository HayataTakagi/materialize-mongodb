// 外部ライブラリのインポート
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();
const env = process.env;
// 自作外部ファイルのインポート
const modelBilder = require('./../static/modelBilder');
const lib = require('./../lib');
const mv = require('./materializedView');
const showLog = lib.showLog;

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// オリジナルコレクション&MV更新処理
let updateDocuments = function updateDocuments(body ,callback) {
  showLog('Starting updateDocuments' , lib.topLog);
  let processId = body.processId ? body.processId : "NoName";
  modelBilder.startTimeList[processId] = performance.now();
  modelList[body.modelName].
  find(body.query).
  exec(function (err, docs) {
    if (err) {
      console.log(err);
      callback(err, null);
    }
    // オリジナルコレクションの更新
    Object.keys(docs).forEach((value) => {
      // updated_atを更新
      if (!body.updateDocument.hasOwnProperty('updated_at')) {
        body.updateDocument.updated_at = new Date();
      }
      // 更新処理
      Object.assign(docs[value], body.updateDocument);
      docs[value].save((err, doc) => {
        if (err) {
          console.log(err);
          callback(err, null);
        }
        showLog(`updateDocuments | (ORIGINAL)Updated to \n${doc}`, lib.normalLog);
      });
    });
    if (env.IS_USE_MV != 1) {
      showLog("updateDocuments | \"IS_USE_MV\" is set FALSE", lib.lowLog);
    } else {
      // オリジナルに関わるMVを更新
      updateMvDocuments(docs, body.modelName, body.query, body.updateDocument, processId);
    }
    console.log(`startTime(${processId}): ${modelBilder.startTimeList[processId]}`);
    modelBilder.queryLogUpdate(processId, body.modelName);
    callback(null, docs);
  });
};

// mvを更新する
function updateMvDocuments(originalDocs, modelName, query, updateDocument, processId) {
  // MVコレクションの更新
  // MV更新処理(parent)
  showLog("(PARENT-POPULATE)Start updating MvDocuments" , lib.normalLog);
  var doc_ids = Object.keys(originalDocs).map((element) => {
    return originalDocs[element]._id;
  });
  logModelList['Mvlog'].find({original_model: modelName}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('End updateDocuments' , lib.lowLog);
      callback(err, null);
    }
    // そのModel自体がMV化されている際に更新処理を行う
    if (docs.length !== 1) {
      showLog(`updateMvDocuments | (PARENT-POPULATE)NOT Updating ${modelName}'s MV collection BECAUSE ${modelName} doesn't have MV.` , lib.normalLog);
    } else {
      showLog(`updateMvDocuments | (PARENT-POPULATE)Updating ${modelName}'s MV collection.`, lib.normalLog);
      mv.createMvDocument(modelName, docs[0].populate, processId, doc_ids);
    }
  });

  // MV更新処理(children)
  showLog("(CHILDREN-POPULATE)Start updating MvDocuments" , lib.normalLog);
  logModelList['Mvlog'].find({populate_model: {$elemMatch:{$eq: modelName}}}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('(CHILDREN-POPULATE)End updateDocuments BECAUSE Error' , lib.topLog);
      callback(err, null);
    }
    if (docs.length < 1) {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)NOT Updating populate-${modelName}'s MV collection BECAUSE populate-${modelName} doesn't have MV.` , lib.lowLog);
    } else {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)Updating populate-${modelName}'s MV collection.`, lib.lowLog);
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
      updateChildrenMv(toUpdateMv, doc_ids, processId);
    }
  });
}

// populate先のMV更新
function updateChildrenMv(toUpdateMv, doc_ids, processId) {
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
        showLog(`updateChildrenMv | (CHILDREN-POPULATE)Updating populate-MV ${to_update_ids.length} docs in ${modelName_key}`, lib.lowLog);
        mv.createMvDocument(modelName_key, docs[0].log_populate, processId, to_update_ids);
      });
    });
  });
}

module.exports = {
  // Method
  // オリジナル&MV更新処理
  updateDocuments: updateDocuments,
};
