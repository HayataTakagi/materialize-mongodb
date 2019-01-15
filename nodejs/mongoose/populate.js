const mongoose = require('mongoose'),
utils = require('mongoose-utils/node_modules/mongoose/lib/utils'),
{ PerformanceObserver, performance } = require('perf_hooks'),
co = require('co'),
__ = require('underscore'),
lib = require('./../lib'),
index = require('./index'),
schemaIndex = require('./schemaIndex');
const showLog = lib.showLog;
require('dotenv').config();
const env = process.env;

// Mngooseのバッファの設定
mongoose.set('bufferCommands', true);
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId,
Mixed = Schema.Types.Mixed;

// 経過時間用
var preTime = performance.now(), preEndTime, postTime;
// populate先モデルリスト
var populateModelList = {};
// モデル別populate先リスト
var populateListForModel = {};

// ログレベル
const topLog = 1,
normalLog = 2,
lowLog = 3,
wasteLog = 4;

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
      preTime = performance.now();  // showLog用
      showLog("Prehook | Start", preTime, wasteLog);
      var self = this;
      // クエリログの為に書き換えられる可能性のあるパラメーターを保存
      self.modelName_ori = self.model.modelName;
      if (self._mongooseOptions.populate != null) {
        self._mongooseOptions_ori = self._mongooseOptions;
      }

      if (env.IS_USE_MV != 1) {
        showLog("Prehook | \"IS_USE_MV\" is set FALSE", preTime, normalLog);
        preEndTime = performance.now();  // クエリログ用
        next();
      } else {
        if (self._mongooseOptions.populate == null) {
          // populateがない
          showLog("Prehook | End", preTime, wasteLog);
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
              showLog('Exist MV.', preTime, lowLog);
              // クエリをmvに書き換え
              rewriteQueryToMv(self, function(err) {
                preEndTime = performance.now();  // クエリログ用
                next(err);
              });
              showLog("Prehook | End", preTime, wasteLog);
              preEndTime = performance.now();  // クエリログ用
              next();
            } else {
              showLog('NOT Exist MV', preTime, lowLog);
              showLog("Prehook | End", preTime, wasteLog);
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

Object.keys(schemaList).forEach(function(value) {
  schemaList[value].pre('updateOne', function(next) {
    try {
      preTime = performance.now();
      showLog("Prehook | Start", preTime, wasteLog);
      showLog("Prehook | End", preTime, wasteLog);
      preEndTime = performance.now();  // クエリログ用
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
      showLog("Posthook | Start", preTime, wasteLog);
      // 処理時間の計算
      postTime = performance.now();
      let elapsedTime = (postTime - preEndTime);
      showLog(`This Query's elapsedTime is [[ ${elapsedTime} ]]ms` ,preTime, normalLog);
      // クエリログの保存
      let self = this;
      queryLog(elapsedTime, self);
      showLog("Posthook | End", preTime, wasteLog);
      next();
    } catch (err) {
      next(err);
    }
  });
});

Object.keys(schemaList).forEach(function(value) {
  schemaList[value].post('updateOne', function(doc, next) {
    try {
      showLog("Posthook | Start", preTime, wasteLog);
      // 処理時間の計算
      if (doc.modifiedCount) {
        // console.log('変更があった');
      }
      postTime = performance.now();
      let elapsedTime = (postTime - preEndTime);
      showLog(`This Query's elapsedTime is [[ ${elapsedTime} ]]` ,preTime, normalLog);
      // クエリログの保存
      let self = this;
      queryLog(elapsedTime, self);
      showLog("Posthook | End", preTime, wasteLog);
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

db.on('error', console.error.bind(console, 'connection error:'));
showLog('[Process Start]', preTime, topLog);

// クエリログの保存
function queryLog(elapsedTime, obj) {
  showLog('Writing Query Log', preTime, wasteLog);
  let saveObject = {
    elapsed_time: elapsedTime,
    options: obj.options,
    collection_name: obj.mongooseCollection.collection.s.name,
    model_name: obj.modelName_ori,
    method: obj.op,
    query: obj._conditions,
  };
  if (obj.hasOwnProperty("_mongooseOptions_ori")) {
    saveObject.populate = Object.keys(obj._mongooseOptions_ori.populate);
  }
  if (global.testId) {
    saveObject.test_id = global.testId;
  }
  // クエリが書き換えられたかどうか
  saveObject.is_rewrited = obj._isRewritedQuery ? 1 : 0;
  logModelList['Userlog'].insertMany(saveObject, function(err, docs) {
    if (err) return console.log(err);
  });
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

// MVログの削除
function removeMvLog(modelName, collectionName, populate) {
  logModelList['Mvlog'].deleteMany({original_model: modelName, original_coll: collectionName, populate: populate}, function(err) {
    if (err) return console.log(err);
  });
}

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
    showLog('Finish rewrite Query To Mv', preTime, normalLog);
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
    showLog('mvSchemaBilder | ' + value + '\'s mv has created.', preTime, topLog);
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

// populate先がschemaで宣言されているか
function checkPopulateAdequacy(modelName, populate) {
  var returnObject = true;
  Object.keys(populate).forEach((value) => {
    if (!schemaSeeds[lib.getSchemaName(modelName)].hasOwnProperty(populate[value])) {
      returnObject = false;
      showLog(`[WANING] Skiped ${modelName}-[${populate.join(',')}] Because ${modelName} has NOT ${populate[value]} in Schema.`, preTime, topLog);
      return;
    }
  });
  return returnObject;
}

// mvを更新する
async function updateMvDocuments(original_docs, modelName, query, update_document) {
  // MVコレクションの更新
  // MV更新処理(parent)
  showLog("(PARENT-POPULATE)Start updating MvDocuments" ,preTime, normalLog);
  var doc_ids = Object.keys(original_docs).map((element) => {
    return original_docs[element]._id;
  });
  logModelList['Mvlog'].find({original_model: modelName}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('End updateDocuments' ,preTime, lowLog);
      callback(err, null);
    }
    // そのModel自体がMV化されている際に更新処理を行う
    if (docs.length !== 1) {
      showLog(`updateMvDocuments | (PARENT-POPULATE)NOT Updating ${modelName}'s MV collection BECAUSE ${modelName} doesn't have MV.` ,preTime, normalLog);
    } else {
      showLog(`updateMvDocuments | (PARENT-POPULATE)Updating ${modelName}'s MV collection.`, preTime, normalLog);
      createMvDocument(modelName, docs[0].populate, doc_ids);
    }
  });

  // MV更新処理(children)
  showLog("(CHILDREN-POPULATE)Start updating MvDocuments" ,preTime, normalLog);
  logModelList['Mvlog'].find({populate_model: {$elemMatch:{$eq: modelName}}}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('(CHILDREN-POPULATE)End updateDocuments BECAUSE Error' ,preTime, topLog);
      callback(err, null);
    }
    if (docs.length < 1) {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)NOT Updating populate-${modelName}'s MV collection BECAUSE populate-${modelName} doesn't have MV.` ,preTime, lowLog);
    } else {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)Updating populate-${modelName}'s MV collection.`, preTime, lowLog);
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
        showLog(`updateChildrenMv | (CHILDREN-POPULATE)Updating populate-MV ${to_update_ids.length} docs in ${modelName_key}`, preTime, lowLog);
        createMvDocument(modelName_key, docs[0].log_populate, to_update_ids);
      });
    });
  });
}

// MVの作成
let createMvDocument = function createMvDocument(modelName, populate, document_id=null) {
  let okCount=0, matchedCount=0, modifiedCount=0, upsertedCount=0;
  let collectionName = utils.toCollectionName(modelName);
  var query = {};
  if (document_id) {
    query._id = document_id;
    var logLev = normalLog;
  } else {
    var logLev = lowLog;
    showLog(`createMvDocument | Create Mv Collection of ${modelName}`, preTime, normalLog);
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
    Object.keys(populateListForModel).forEach(value => {
      createMvDocument(value, populateListForModel[value]);
    });
    callback(null, {"message": "ok"});
  }

  // MV作成判断
  let judgeCreateMv = function judgeCreateMv(callback) {
    preTime = performance.now();
    showLog('Starting judgeCreateMv',preTime, topLog);
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
        showLog('Finish Cluclation About userLog' , preTime, topLog);
        console.log(userLogObject);
        // 各コレクションの最重要項目のみMV化
        Object.keys(userLogObject).forEach((value) => {
          if (value != "undefined") {
            // 上位からpopulate先が存在するものがあるまでループを実行
            userLogObject[value].some((logObject) => {
              let topUserLog = logObject._id;
              // populateの妥当性をチェック
              if (checkPopulateAdequacy(topUserLog.model_name, topUserLog.populate)) {
                showLog(`Create MV (model_name: ${topUserLog.model_name}, populate: [${topUserLog.populate.join(',')}])`, preTime, topLog);
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
      showLog('Starting updateDocuments' ,preTime, topLog);
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
              showLog(`updateDocuments | (ORIGINAL)Updated to \n${doc}`, preTime, normalLog);
            });
          });
          if (env.IS_USE_MV != 1) {
            showLog("updateDocuments | \"IS_USE_MV\" is set FALSE", preTime, lowLog);
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
      showLog('Starting createEx1Collection' ,preTime, topLog);
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
      showLog('Starting removeCollections' ,preTime, topLog);
      if (body.isRemoveOriginal || body.isRemoveAll) {
        showLog(`Remove (ORIGINAL)-collections of [${Object.keys(modelList)}]`,preTime, topLog);
        Object.keys(modelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let originalCollectionName = utils.toCollectionName(value);
          // コレクションの削除処理
          db.dropCollection(originalCollectionName, (err, res) => {
            if (err) showLog(`Error remove (ORIGINAL)-collections of ${value}`, preTime, normalLog);
            if (res) showLog(`Success remove (ORIGINAL)-collections of ${value}`, preTime, normalLog);
          });
        });
      }
      if (body.isRemoveMv || body.isRemoveAll) {
        showLog(`Remove (MV)-collections of [${Object.keys(mvModelList)}]`,preTime, topLog);
        Object.keys(mvModelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let mvCollectionName = lib.getMvCollectionName(utils.toCollectionName(value));
          // コレクションの削除処理
          db.dropCollection(mvCollectionName, (err, res) => {
            if (err) showLog(`Error remove (MV)-collections of ${value}`, preTime, normalLog);
            if (res) showLog(`Success remove (MV)-collections of ${value}`, preTime, normalLog);
          });
        });
      }
      if (body.isRemoveLog || body.isRemoveAll) {
        showLog(`Remove (LOG)-collections of [${Object.keys(logModelList)}]`,preTime, topLog);
        Object.keys(logModelList).forEach(value => {
          // MVのコレクション名をモデル名から取得
          let logCollectionName = utils.toCollectionName(value);
          // コレクションの削除処理
          db.dropCollection(logCollectionName, (err, res) => {
            if (err) showLog(`Error remove (LOG)-collections of ${value}`, preTime, normalLog);
            if (res) showLog(`Success remove (LOG)-collections of ${value}`, preTime, normalLog);
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
