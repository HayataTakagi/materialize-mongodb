// 外部ライブラリのインポート
const utils = require('mongoose-utils/node_modules/mongoose/lib/utils');
const { PerformanceObserver, performance } = require('perf_hooks');
const co = require('co');
require('dotenv').config();
const env = process.env;
// 自作外部ファイルのインポート
const modelBilder = require('./../static/modelBilder');
const lib = require('./../lib');
const showLog = lib.showLog;

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// MVの作成
let createMvDocument = function createMvDocument(modelName, populate, processId, documentIds=null) {
  let collectionName = utils.toCollectionName(modelName);
  var query = {};
  if (documentIds) {
    query._id = documentIds;
    var logLev = lib.normalLog;
  } else {
    var logLev = lib.lowLog;
    showLog(`createMvDocument | Create Mv Collection of ${modelName}`, lib.normalLog);
  }
  modelList[modelName].
  find(query).
  populate(populate).
  exec(function (err, mvDocuments) {
    if (err) return console.log(err);
    // promise all 後に処理 & co then 後に処理
    const mvSavePromises = Object.keys(mvDocuments).map((value) => {
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
          modelBilder.queryLogUpdate(processId, `Mv${modelName}`);
          showLog(`createMvDocument | modelName:${modelName}, id: ${mvDocuments[value]._id}, ok:${res.ok}, matchedCount:${res.n}, modifiedCount:${res.nModified}, now:${performance.now()}`, logLev);
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
    }
  );
};

// 全てのモデルに対してMV作成
let createMvDocumentAll = function createMvDocumentAll(callback) {
  showLog('Starting createMvDocumentAll', lib.topLog);
  Object.keys(populateListForModel).forEach(value => {
    createMvDocument(value, populateListForModel[value]);
  });
  callback(null, {"message": "ok"});
};

// MV作成判断
let judgeCreateMv = function judgeCreateMv(callback) {
  showLog('Starting judgeCreateMv', lib.topLog);
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
      showLog('Finish Cluclation About userLog' , lib.topLog);
      console.log(userLogObject);
      // 各コレクションの最重要項目のみMV化
      Object.keys(userLogObject).forEach((value) => {
        if (value != "undefined") {
          // 上位からpopulate先が存在するものがあるまでループを実行
          userLogObject[value].some((logObject) => {
            let topUserLog = logObject._id;
            // populateの妥当性をチェック
            if (checkPopulateAdequacy(topUserLog.model_name, topUserLog.populate)) {
              showLog(`Create MV (modelName: ${topUserLog.model_name}, populate: [${topUserLog.populate.join(',')}])`, lib.topLog);
              createMvDocument(topUserLog.model_name, topUserLog.populate);
              return true;  // ループ文(some)を抜ける
            }
          });
        }
      });
      callback(null, userLogObject);
    }
  );
};

// populate先がschemaで宣言されているか
function checkPopulateAdequacy(modelName, populate) {
  var returnObject = true;
  Object.keys(populate).forEach((value) => {
    if (!schemaSeeds[lib.getSchemaName(modelName)].hasOwnProperty(populate[value])) {
      returnObject = false;
      showLog(`[WANING] Skiped ${modelName}-[${populate.join(',')}] Because ${modelName} has NOT ${populate[value]} in Schema.`, lib.topLog);
      return;
    }
  });
  return returnObject;
}

// MVログの記録
function createMvLog(modelName, collectionName, populate) {
  // populate先のモデル名を取得する
  var populateModel = [];
  Object.keys(populate).forEach((value) => {
    populateModel.push(populateModelList[populate[value]]);
  });
  let saveObject = {
    original_model: modelName,
    original_coll: collectionName,
    populate: populate,
    populate_model: populateModel,
    updated_at: new Date(),
  };
  logModelList['Mvlog'].bulkWrite([
    {
      updateOne: {
        filter: {original_model: modelName},  // 各値で検索
        update: saveObject,  // 更新日を更新
        upsert: true,  // 存在しなかった場合新規作成する
        setDefaultsOnInsert: true  // スキーマでdefaultで設定されている値を代入
      }
    }
  ]);
}

module.exports = {
  // Method
  // MVの作成
  createMvDocument: createMvDocument,
  // すべてのモデルに対してMV作成
  createMvDocumentAll: createMvDocumentAll,
  // MV作成判断
  judgeCreateMv: judgeCreateMv,
};
