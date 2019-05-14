// 外部ライブラリのインポート
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();
const env = process.env;
// 自作外部ファイルのインポート
const modelBilder = require('./../static/modelBilder');
const lib = require('./../lib');
const mv = require('./materializedView');
const index = require('./../index');
const showLog = lib.showLog;

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// オリジナルコレクション&MV更新処理
let updateDocuments = async (body ,callback) => {
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
    // オリジナル自体のMVが存在するか
    logModelList['Mvlog'].countDocuments({original_model: body.modelName, is_deleted: false}, async (err, mvCount)=> {
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
          modelBilder.queryLogUpdate(processId, body.modelName, null, mvCount && global.isUseMv);  // ログ書き込み
        });
      });
      if (global.isUseMv != 1) {
        showLog("updateDocuments | \"global.isUseMv\" is set FALSE", lib.lowLog);
      } else {
        // オリジナルに関わるMVを更新
        await updateMvDocuments(docs, body.modelName, body.query, body.updateDocument, processId);
      }
      callback(null, docs);
    });
  });
};

// mvを更新する
let updateMvDocuments = async (originalDocs, modelName, query, updateDocument, processId) => {
  // MVコレクションの更新
  // MV更新処理(parent)
  showLog("(PARENT-POPULATE)Start updating MvDocuments" , lib.normalLog);
  var doc_ids = Object.keys(originalDocs).map((element) => {
    return originalDocs[element]._id;
  });
  let mvLogRes = await logModelList['Mvlog'].find({original_model: modelName, is_deleted: false}).exec();
  // そのModel自体がMV化されている際に更新処理を行う
  if (mvLogRes.length !== 1) {
    showLog(`updateMvDocuments | (PARENT-POPULATE)NOT Updating ${modelName}'s MV collection BECAUSE ${modelName} doesn't have MV.` , lib.normalLog);
  } else {
    showLog(`updateMvDocuments | (PARENT-POPULATE)Updating ${modelName}'s MV collection.`, lib.normalLog);
    await mv.createMvDocument(modelName, mvLogRes[0].populate, processId, modelName, doc_ids);
  }

  // MV更新処理(children)
  showLog("(CHILDREN-POPULATE)Start updating MvDocuments" , lib.normalLog);
  let MvLogChildRes = await logModelList['Mvlog'].find({populate_model: {$elemMatch:{$eq: modelName}}, is_deleted: false}).exec();
  if (MvLogChildRes.length < 1) {
    showLog(`updateMvDocuments | (CHILDREN-POPULATE)NOT Updating populate-${modelName}'s MV collection BECAUSE populate-${modelName} doesn't have MV.` , lib.lowLog);
  } else {
    showLog(`updateMvDocuments | (CHILDREN-POPULATE)Updating populate-${modelName}'s MV collection.`, lib.lowLog);
    // そのModelがmv_populateとして埋め込まれている際に更新処理を行う
    let toUpdateMv = {};
    Object.keys(MvLogChildRes).forEach((value) => {
      // populate_modelが更新されているModelと一致した際にpopulateをpushして保存する
      Object.keys(MvLogChildRes[value].populate_model).forEach((key) => {
        if (MvLogChildRes[value].populate_model[key] === modelName) {
          if (!Array.isArray(toUpdateMv[MvLogChildRes[value].original_model])) {
            toUpdateMv[MvLogChildRes[value].original_model] = [];
          }
          toUpdateMv[MvLogChildRes[value].original_model].push(MvLogChildRes[value].populate[key])
        }
      });
    });
    await updateChildrenMv(toUpdateMv, doc_ids, processId, modelName);
  }
}

// populate先のMV更新
let updateChildrenMv = async (toUpdateMv, doc_ids, processId, parentModelName) => {
  let toUpdateModelIndex = Object.keys(toUpdateMv);
  for(let index = 0; index < toUpdateModelIndex.length; index++) {
    let modelName_key = toUpdateModelIndex[index];
    let populateIndex = Object.keys(toUpdateMv[modelName_key]);
    for(let index2 = 0; index2 < populateIndex.length; index2++) {
      let populate_key = populateIndex[index2];
      let path = toUpdateMv[modelName_key][populate_key] + '._id';
      let query = { [path]: {$in: doc_ids}};
      // mvコレクションにあるドキュメントのみcreateMvする
      let docs = await mvModelList[modelName_key].find(query).exec();
      if (docs.length < 1) continue;
      let to_update_ids = Object.keys(docs).map((element) => {
        // 更新するidをリスト化
        return docs[element]._id;
      });
      showLog(`updateChildrenMv | (CHILDREN-POPULATE)Updating populate-MV ${to_update_ids.length} docs in ${modelName_key}`, lib.lowLog);
      await mv.createMvDocument(modelName_key, docs[0].log_populate, processId, parentModelName, to_update_ids);
    }
  }
}

module.exports = {
  // Method
  // オリジナル&MV更新処理
  updateDocuments: updateDocuments,
};
