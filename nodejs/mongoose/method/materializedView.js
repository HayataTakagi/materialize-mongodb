// 外部ライブラリのインポート
const mongoose = require('mongoose');
const utils = require('mongoose-utils/node_modules/mongoose/lib/utils');
const { PerformanceObserver, performance } = require('perf_hooks');
const co = require('co');
require('dotenv').config();
const env = process.env;
// Mngooseのバッファの設定
mongoose.set('bufferCommands', false);
mongoose.connect(`mongodb://${env.DB_IP}/${env.DB_NAME}`, { useNewUrlParser: true });
var db = mongoose.connection;
// 自作外部ファイルのインポート
const modelBilder = require('./../static/modelBilder');
const lib = require('./../lib');
const experiment = require('./../experiment');
const mongoDriver = require('./mongoDriver');
const index = require('./../index');
const showLog = lib.showLog;

// モデルリストの定義
const modelList = modelBilder.modelList;
const mvModelList = modelBilder.mvModelList;
const logModelList = modelBilder.logModelList;
// populateリストの定義
const populateModelList = modelBilder.populateModelList;
const populateListForModel = modelBilder.populateListForModel;

// MVの作成
let createMvDocument = async function createMvDocument(modelName, populate, processId, parentModelName, documentIds=null) {
  let collectionName = utils.toCollectionName(modelName);
  if (documentIds) {
    // 該当IDの結合したコレクションの取得
    let mvDocuments = await modelList[modelName]
      .find({_id: documentIds})
      .populate(populate)
      .exec()
      .catch((err) => showLog(`[ERROR] FAIL Get mvDocuments of ${modelName}`, lib.lowLog));
    // idが指定されている場合はMVを個別に更新する
    for(let index = 0; index < mvDocuments.length; index++) {
      // ログ要素を追加
      mvDocuments[index] = mvDocuments[index].toObject();
      mvDocuments[index].log_populate = populate;
      mvDocuments[index].log_updated_at = new Date();
      // mvをdbに保存
      let response =  await mvModelList[modelName].replaceOne(
        {_id: mvDocuments[index]._id},  // idで検索する
        mvDocuments[index],  // 保存するobject
        {upsert: true, setDefaultsOnInsert: true}).exec();
      // update時のクエリを記録
      if (processId != null) {
        modelBilder.queryLogUpdate(processId, parentModelName, `Mv${modelName}`, true);
      }
      showLog(`createMvDocument | Finish Saving to Mv${modelName}(${index+1}/${mvDocuments.length}) about id: ${mvDocuments[index]._id}`, lib.normalLog);
    }
    // MVログの更新
    createMvLog(modelName, collectionName, populate);
    return 'ok';
  } else {
    showLog(`createMvDocument | Create Mv Collection of ${modelName}`, lib.normalLog);
    // モデル全体をMV化する場合にはmvコレクションを削除し,新しくinsertManyする
    await hardRemoveMvDocument(lib.getMvCollectionName(collectionName), modelName).catch((err) => showLog(`[ERROR] FAIL Remove Old Mv of ${modelName}`, lib.lowLog));
    showLog(`createMvDocument | Finish Remove Old Mv of ${modelName}`, lib.wasteLog);
    // コレクションサイズを取得
    let count = await modelList[modelName].countDocuments().catch((err) => showLog(`[ERROR] FAIL countDocuments of ${modelName}`, lib.lowLog));
    const limitDoc = 50;  // 50件ずつ取得する
    let loop = Math.ceil(count / limitDoc);  // 取得回数
    for (let i = 0; i < loop; i++) {
      let skip = limitDoc * i;
      // 結合したコレクションを取得
      let mvDocuments = await modelList[modelName]
        .find()
        .skip(skip)
        .limit(limitDoc)
        .populate(populate)
        .exec()
        .catch((err) => showLog(`[ERROR] FAIL Get mvDocuments of ${modelName}`, lib.lowLog));
        Object.keys(mvDocuments).forEach((value) => {
          // ログ要素を追加
          mvDocuments[value] = mvDocuments[value].toObject();
          mvDocuments[value].log_populate = populate;
          mvDocuments[value].log_created_at = new Date();
          mvDocuments[value].log_updated_at = new Date();
        });
        await mongoDriver.mongoinsertMany(lib.getMvCollectionName(collectionName), mvDocuments);
        showLog(`createMvDocument | Finish Create Mv(${i+1}/${loop}) MvCollection of ${modelName}`, lib.normalLog);
    }
    // MVログを記録
    createMvLog(modelName, collectionName, populate);
    return 'ok';
  }
};

// MVドキュメントの初期化
let hardRemoveMvDocument = async (removeMvName, modelName) => {
  showLog(`HARD Remove (MV)-collections of ${removeMvName}`, lib.topLog);
  let count = await mvModelList[modelName].countDocuments();
  if (count > 0) {
    db.dropCollection(removeMvName, (err, res) => {
      if (err) {
        showLog(`Error HARD Remove (MV)-collections of ${removeMvName}`, lib.normalLog);
        throw err;
        callback(err, null);
      } else {
        showLog(`Success HARD Remove (MV)-collections of ${removeMvName}`, lib.normalLog);
        return res;
      }
    });
  } else {
    return {"message": "no drop collection Because no collections in DB"};
  }
};

// 全てのモデルに対してMV作成
let createMvDocumentAll = async (callback) => {
  showLog('Starting createMvDocumentAll', lib.topLog);
  let populateListForModelIndex = Object.keys(populateListForModel);
  for(let index = 0; index < populateListForModelIndex.length; index++) {
    let modelNameIndex = populateListForModelIndex[index];
    await createMvDocument(modelNameIndex, populateListForModel[modelNameIndex], null, modelNameIndex, null).catch((err) => showLog(`[ERROR] FAIL createMvDocument`, lib.topLog));
  }
  callback(null, {"message": "ok"});
};

// MVを論理削除する
function reverceCreateMvDocument(modelName) {
  let saveObject = {"is_deleted": true, "updated_at": new Date()};
  logModelList['Mvlog'].updateOne({original_model: modelName}, saveObject, (err, raw) => {
    if (err) return console.log(err);
    showLog(`reverceCreateMvDocument | modelName: ${modelName} response: ${JSON.stringify(raw)}`, lib.normalLog);
  });
}

// MV作成判断
let judgeCreateMv = async (isChecked=null, callback) => {
  let analizeMethodList = ["update", "findOne"];  // 解析に用いるMongoのmethod
  var shouldCreateMvList = [];
  showLog('Starting judgeCreateMv', lib.topLog);
  // ユーザーログの読み込み
  let aggregate = await logModelList['Userlog'].aggregate([
    { $match: {
      date: {
        $lt: new Date(),
        $gte: new Date(Date.now() - env.MV_ANALYSIS_PERIOD)},
      test_id: global.testId,
      }},
      { $group: {
        _id: {ori_model_name: "$ori_model_name", method: "$method", is_rewrited: "$is_rewrited", process_id: "$process_id"},
        elapsed_time_max: { $max: "$elapsed_time"},
        count_query: { $sum: 1}
      }},
      { $group: {
        _id: { ori_model_name: "$_id.ori_model_name", method: "$_id.method", is_rewrited: "$_id.is_rewrited"},
        total_time: { $sum: "$elapsed_time_max"},
        average_time: { $avg: "$elapsed_time_max"},
        count_post: { $sum: 1},
        count_query: { $sum: "$count_query"},
      }},
      { $sort: { "_id.ori_model_name": 1, "_id.method" :1}}
    ]).exec();

    // model一覧
    let modelIndex = Object.keys(populateListForModel);
    // model毎にmv化チェックをする
    for(let index = 0; index < modelIndex.length; index++) {
      let model = modelIndex[index];
      if (populateListForModel[model].length === 0) {
        // populate先がないのでmv判定不要
        showLog(`${model} doesn't have populate.`, lib.normalLog);
      } else {
        let mvLogDoc = await logModelList['Mvlog'].find({original_model: model});
        if (mvLogDoc.length === 0) {
          // mvが存在せず,過去にも作られたことがない
          // 初期MV化条件を検討
          let logList = [];
          showLog(`${model} doesn't have MV ALSO hasn't created MV.`, lib.normalLog);
          // このmodelに関するlogのみ抽出
          let logForFirstCreateMv = aggregate.filter((logObject) => {
            return (logObject._id.ori_model_name === model && logObject._id.is_rewrited === false);
          });
          // method毎に整理する
          Object.keys(logForFirstCreateMv).forEach((value) => {
            if (analizeMethodList.includes(logForFirstCreateMv[value]["_id"]["method"])) {
              logList[logForFirstCreateMv[value]["_id"]["method"]] = logForFirstCreateMv[value];
            }
          });
          if (Object.keys(logList).length === 0) {
            // 解析するlogがないので終了
            showLog(`${model} have NO userLog to analize.`, lib.normalLog);
          } else if (Object.keys(logList).length < analizeMethodList.length) {
            // findOneのみの場合はMV化し,updateのみの場合はMV化しない
            if (Object.keys(logList)[0] === "findOne") {
              showLog(`${model} should be created MV BECAUSE has only findOne Log.`, lib.normalLog);
              if (isChecked) {
                // リストに追加
                shouldCreateMvList.push(model);
              } else {
                // MV作成
                await createMvDocument(model, populateListForModel[model], null, model, null);
              }
            } else {
              showLog(`${model} has only update Log.`, lib.normalLog);
            }
          } else if (Object.keys(logList).length === analizeMethodList.length) {
            // findOneとupdateのクエリ数の比を比べる
            if (logList["findOne"]["count_post"] > logList["update"]["count_post"] * env.MV_FIND_UPDATE_PERCENTAGE) {
              showLog(`${model} should be created MV BECAUSE find/update is OVER ${env.MV_FIND_UPDATE_PERCENTAGE}.`, lib.normalLog);
              if (isChecked) {
                // リストに追加
                shouldCreateMvList.push(model);
              } else {
                // MV作成
                await createMvDocument(model, populateListForModel[model], null, model, null);
              }
            } else {
              showLog(`${model} should NOT be created MV BECAUSE find/update is LOWER ${env.MV_FIND_UPDATE_PERCENTAGE}.`, lib.normalLog);
            }
          } else {
            showLog(`${model} FAILE analize mvLog!`, lib.topLog);
          }
          // end of "if (mvLogDoc.length === 0)"

        } else if (mvLogDoc[0]["is_deleted"]) {
          // mvが存在しないが,過去には作られたことがある
          // TODO: 二度目以降のMV化条件の実装
          showLog(`${model} doesn't have MV BUT has created MV.`, lib.normalLog);

          // ===== 上記のコピー
          let logList = [];
          // このmodelに関するlogのみ抽出
          let logForFirstCreateMv = aggregate.filter((logObject) => {
            return (logObject._id.ori_model_name === model && logObject._id.is_rewrited === false);
          });
          // method毎に整理する
          Object.keys(logForFirstCreateMv).forEach((value) => {
            if (analizeMethodList.includes(logForFirstCreateMv[value]["_id"]["method"])) {
              logList[logForFirstCreateMv[value]["_id"]["method"]] = logForFirstCreateMv[value];
            }
          });
          if (Object.keys(logList).length === 0) {
            // 解析するlogがないので終了
            showLog(`${model} have NO userLog to analize.`, lib.normalLog);
          } else if (Object.keys(logList).length < analizeMethodList.length) {
            // findOneのみの場合はMV化し,updateのみの場合はMV化しない
            if (Object.keys(logList)[0] === "findOne") {
              showLog(`${model} should be created MV BECAUSE has only findOne Log.`, lib.normalLog);
              if (isChecked) {
                // リストに追加
                shouldCreateMvList.push(model);
              } else {
                // MV作成
                await createMvDocument(model, populateListForModel[model], null, model, null);
              }
            } else {
              showLog(`${model} has only update Log.`, lib.normalLog);
            }
          } else if (Object.keys(logList).length === analizeMethodList.length) {
            // findOneとupdateのクエリ数の比を比べる
            if (logList["findOne"]["count_post"] > logList["update"]["count_post"] * env.MV_FIND_UPDATE_PERCENTAGE) {
              showLog(`${model} should be created MV BECAUSE find/update is OVER ${env.MV_FIND_UPDATE_PERCENTAGE}.`, lib.normalLog);
              if (isChecked) {
                // リストに追加
                shouldCreateMvList.push(model);
              } else {
                // MV作成
                await createMvDocument(model, populateListForModel[model], null, model, null);
              }
            } else {
              showLog(`${model} should NOT be created MV BECAUSE find/update is LOWER ${env.MV_FIND_UPDATE_PERCENTAGE}.`, lib.normalLog);
            }
          } else {
            showLog(`${model} FAILE analize mvLog!`, lib.topLog);
          }
          // ===== コピー終わり

        } else if (!mvLogDoc[0]["is_deleted"] && !isChecked) {
          // mvが存在する
          // 逆MV化条件の検討
          showLog(`${model} has MV.`, lib.normalLog);
          let logList = [];
          // このmodelに関するlogのみ抽出
          let logForReverceCreateMv = aggregate.filter((logObject) => {
            return (logObject._id.ori_model_name === model && logObject._id.is_rewrited === true);
          });
          // method毎に整理する
          Object.keys(logForReverceCreateMv).forEach((value) => {
            if (analizeMethodList.includes(logForReverceCreateMv[value]["_id"]["method"])) {
              logList[logForReverceCreateMv[value]["_id"]["method"]] = logForReverceCreateMv[value];
            }
          });
          if (Object.keys(logList).length === 0) {
            // 解析するlogがないので終了
            showLog(`${model} have NO userLog to analize.`, lib.normalLog);
          } else if (Object.keys(logList).length < analizeMethodList.length) {
            // findOneのみの場合は何もせず,updateのみの場合は逆MV化
            if (Object.keys(logList)[0] === "findOne") {
              showLog(`${model} should keep MV BECAUSE has only findOne Log.`, lib.normalLog);
            } else {
              showLog(`${model} should REVERCE MV BECAUSE has only update Log.`, lib.normalLog);
              // 逆MV化
              reverceCreateMvDocument(model);
            }
          } else if (Object.keys(logList).length === analizeMethodList.length) {
            // 累計クエリ時間を比較する
            if (logList["findOne"]["total_time"] < logList["update"]["total_time"]) {
              showLog(`${model} should REVERCE MV BECAUSE total_time is find < update.`, lib.normalLog);
              // 逆MV化
              reverceCreateMvDocument(model);
            } else {
              showLog(`${model} should keep MV BECAUSE total_time is find > update.`, lib.normalLog);
            }
          }
          console.log(logList);
        } else {
          showLog(`${model} FAILE analize mvLog!`, lib.topLog);
        }
      }
    }
    if (isChecked) {
      callback(null, shouldCreateMvList);
    } else {
      callback(null, aggregate);
    }
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
function createMvLog(modelName, collectionName, populate, isDelete=false) {
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
    is_deleted: isDelete,
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

// mvが作成されているかのチェック
let checkCompletedCreatedMv = async (checkModelList, mvNum) => {
  let completeModel = [];
  let unCompleteModel = [];
  for (let i = 0; i < checkModelList.length; i++) {
    let count = await mvModelList[checkModelList[i]].countDocuments();
    if (count !== mvNum) {
      console.log(`!!!!!!!${checkModelList[i]} hasn't be created all MV!!!!!!!!!`);
      unCompleteModel.push(checkModelList[i]);
    } else {
      completeModel.push(checkModelList[i]);
    }
  }
  return {complete: completeModel, uncomplete: unCompleteModel};
};

module.exports = {
  // Method
  // MVの作成
  createMvDocument: createMvDocument,
  // すべてのモデルに対してMV作成
  createMvDocumentAll: createMvDocumentAll,
  // MV作成判断
  judgeCreateMv: judgeCreateMv,
  // MV作成完了確認
  checkCompletedCreatedMv: checkCompletedCreatedMv,
};
