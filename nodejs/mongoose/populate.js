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

const schemaSeeds = {
  "personSchema": {
    _id: ObjectId,
    name: String,
    age: Number,
    stories: [{ type: ObjectId, ref: 'Story' }],
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }, "storySchema": {
    _id: ObjectId,
    author: { type: ObjectId, ref: 'Person' },
    title: String,
    fans: [{ type: ObjectId, ref: 'Person' }],
    comments : [{ type: ObjectId, ref: 'Comment' }],
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }, "commentSchema": {
    _id: ObjectId,
    speak: {
      speaker: { type: ObjectId, ref: 'Person' },
      comment: String
    },
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }
};

let mvSchemaSeeds = {
  "personSchema": {
    _id: ObjectId,
    name: String,
    age: Number,
    stories: [{ type: ObjectId, ref: 'Story' }],
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }, "storySchema": {
    _id: ObjectId,
    author: { type: ObjectId, ref: 'Person' },
    title: String,
    fans: [{ type: ObjectId, ref: 'Person' }],
    comments : [{ type: ObjectId, ref: 'Comment' }],
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }, "commentSchema": {
    _id: ObjectId,
    speak: {
      speaker: { type: ObjectId, ref: 'Person' },
      comment: String
    },
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  }
};

const logSchemaSeeds = {
  "userlogSchema": {
    _id: ObjectId,
    elapsed_time: Number,
    options: Mixed,
    collection_name: String,
    model_name: String,
    method: String,
    query: Mixed,
    populate: [ String ],
    is_rewrited: Boolean,
    date: {type: Date, default: Date.now},
  }, "mvlogSchema": {
    _id: ObjectId,
    original_model: String,
    original_coll: String,
    populate: [ String ],
    populate_model: [ String ],
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
      preTime = performance.now();  // showLog用
      showLog("Prehook | Start", preTime);
      var self = this;

      if (self._mongooseOptions.populate == null) {
        // populateがない
        showLog("Prehook | End", preTime);
        preEndTime = performance.now();  // クエリログ用
        next();
      } else {
        // クエリログの為に書き換えられる可能性のあるパラメーターを保存
        self._mongooseOptions_ori = self._mongooseOptions;
        self.modelName_ori = self.model.modelName;

        let modelName = self.model.modelName,
        collectionName = self.mongooseCollection.collectionName,
        populate = Object.keys(self._mongooseOptions.populate);
        // MVログが存在するかでMV化されているか判定する
        logModelList['Mvlog'].countDocuments({original_model: modelName, original_coll: collectionName, populate: populate}, function(err, count) {
          if (err) return console.log(err);
          if (count === 1) {
            showLog('Exist MV.', preTime);
            // クエリをmvに書き換え
            rewriteQueryToMv(self, function(err) {
              preEndTime = performance.now();  // クエリログ用
              next(err);
            });
            showLog("Prehook | End", preTime);
            preEndTime = performance.now();  // クエリログ用
            next();
          } else {
            showLog('NOT Exist MV', preTime);
            showLog("Prehook | End", preTime);
            preEndTime = performance.now();  // クエリログ用
            next();
          }
        });
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
      showLog("Prehook | Start", preTime);
      showLog("Prehook | End", preTime);
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
      showLog("Posthook | Start", preTime);
      // 処理時間の計算
      postTime = performance.now();
      let elapsedTime = (postTime - preEndTime);
      // クエリログの保存
      console.log(this._isRewritedQuery);
      let self = this;
      queryLog(elapsedTime, self);
      showLog("Posthook | End", preTime);
      next();
    } catch (err) {
      next(err);
    }
  });
});

Object.keys(schemaList).forEach(function(value) {
  schemaList[value].post('updateOne', function(doc, next) {
    try {
      showLog("Posthook | Start", preTime);
      // 処理時間の計算
      if (doc.modifiedCount) {
        // console.log('変更があった');
      }
      postTime = performance.now();
      let elapsedTime = (postTime - preEndTime);
      // クエリログの保存
      let self = this;
      queryLog(elapsedTime, self);
      showLog("Posthook | End", preTime);
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
showLog('[Process Start]', preTime);

// クエリ ============================
// modelList['Story'].
// findOne({ title: 'Sotsuken' }).
// populate(['author', 'fans']).
// exec(function (err, story) {
//   if (err) return console.log(err);
//   showLog('クエリ結果', preTime);
//   console.log(story);
// });

// modelList['Person'].
// findOne({ name: 'takagi' }).
// limit(1).
// exec(function (err, person) {
//   if (err) return console.log(err);
//   showLog('クエリ結果', preTime);
//   console.log(person);
// });

// mvModelList['Story'].
// findOne({ title: 'Sotsuken_mv' }).
// exec(function (err, story) {
//   if (err) return console.log(err);
//   showLog('クエリ結果', preTime);
//   console.log(story);
// });
// createMvDocument('Story', ['author', 'fans'], ['5c04f4b8b99d450ff1d8b4a4','5bfccb8286d08d1336bfd3b0']);
// ================================



// クエリログの保存
function queryLog(elapsedTime, obj) {
  showLog('Writing Query Log', preTime);
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
    query.schema = mvSchemaList[getSchemaName(modelName)];
    // コレクション情報書き換え
    query._collection.collection = db.collection(getMvCollectionName(collectionName));
    // populateオプションの除去
    query._mongooseOptions = "";
    // クエリ書き換えのフラグを立てる
    query._isRewritedQuery = true;
    showLog('Finish rewrite Query To Mv', preTime);
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
    showLog('mvSchemaBilder | ' + value + '\'s mv has created.', preTime);
  });
}

// refがあるスキーマをref先のスキーマに置き換える
// ref先のrefは置き換えない
function replaceRefSchema(obj, parent='') {
  Object.keys(obj).forEach(function(value) {

    if (typeof obj[value] != "object") {
      // String, Number, _id 等を弾く
      return;
    } else {
      if(obj[value].hasOwnProperty('ref')) {
        // 参照型の場合埋め込み型に書き換える
        // populate先モデルリストに保存
        if (Array.isArray(obj)) {
          populateModelList[parent] = obj[value].ref;
        } else {
          let current = parent === '' ? value : `${parent}.${value}`;
          populateModelList[current] = obj[value].ref;
        }
        // mvschemaを自動生成した際ここでオリジナルのseedが書き換わってしまう
        obj[value] = completeAssign({}, schemaSeeds[getSchemaName(obj[value].ref)]);
      } else {
        // 探索を続ける
        let next = parent === '' ? value : `${parent}.${value}`;
        replaceRefSchema(obj[value], next);
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

// populate先がschemaで宣言されているか
function checkPopulateAdequacy(modelName, populate) {
  var returnObject = true;
  Object.keys(populate).forEach((value) => {
    if (!schemaSeeds[getSchemaName(modelName)].hasOwnProperty(populate[value])) {
      returnObject = false;
      showLog(`[WANING] Skiped ${modelName}-[${populate.join(',')}] Because ${modelName} has NOT ${populate[value]} in Schema.`, preTime);
      return;
    }
  });
  return returnObject;
}

// mvを更新する
async function updateMvDocuments(original_docs, modelName, query, update_document) {
  // MVコレクションの更新
  // MV更新処理(parent)
  showLog("(PARENT-POPULATE)Start updating MvDocuments" ,preTime);
  var doc_ids = Object.keys(original_docs).map((element) => {
    return original_docs[element]._id;
  });
  logModelList['Mvlog'].find({original_model: modelName}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('End updateDocuments' ,preTime);
      callback(err, null);
    }
    // そのModel自体がMV化されている際に更新処理を行う
    if (docs.length !== 1) {
      showLog(`updateMvDocuments | (PARENT-POPULATE)NOT Updating ${modelName}'s MV collection BECAUSE ${modelName} doesn't have MV.` ,preTime);
    } else {
      showLog(`updateMvDocuments | (PARENT-POPULATE)Updating ${modelName}'s MV collection.`, preTime);
      createMvDocument(modelName, docs[0].populate, doc_ids);
    }
  });

  // MV更新処理(children)
  showLog("(CHILDREN-POPULATE)Start updating MvDocuments" ,preTime);
  logModelList['Mvlog'].find({populate_model: {$elemMatch:{$eq: modelName}}}, (err, docs) => {
    if (err) {
      console.log(err);
      showLog('(CHILDREN-POPULATE)End updateDocuments BECAUSE Error' ,preTime);
      callback(err, null);
    }
    if (docs.length < 1) {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)NOT Updating populate-${modelName}'s MV collection BECAUSE populate-${modelName} doesn't have MV.` ,preTime);
    } else {
      showLog(`updateMvDocuments | (CHILDREN-POPULATE)Updating populate-${modelName}'s MV collection.`, preTime);
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
        showLog(`updateChildrenMv | (CHILDREN-POPULATE)Updating populate-MV ${to_update_ids.length} docs in ${modelName_key}`, preTime)
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
      mvModelList[modelName].bulkWrite([
        {
          replaceOne: {
            filter: {_id: mvDocuments[value]._id},  // idで検索する
            update: mvDocuments[value],  // 保存するobject
            upsert: true,  // 存在しなかった場合新規作成する
            setDefaultsOnInsert: true
          }
        }
      ]).then(res => {
        showLog(`createMvDocument | modelName:${modelName}, id: ${mvDocuments[value]._id}, ok:${res.result.ok}, matchedCount:${res.matchedCount}, modifiedCount:${res.modifiedCount}, upsertedCount:${res.upsertedCount}`, preTime);
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

// MV作成判断
let judgeCreateMv = function judgeCreateMv(callback) {
  preTime = performance.now();
  showLog('Starting judgeCreateMv',preTime);
  // ユーザーログの読み込み
  var aggregate =  logModelList['Userlog'].aggregate([
    { $match: {
      populate: { $exists: true, $ne: [] },
      date: {
        $lt: new Date(),
        $gte: new Date(Date.now() - env.MV_ANALYSIS_PERIOD)}
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
      showLog('Finish Cluclation About userLog' ,preTime);
      console.log(userLogObject);
      // 各コレクションの最重要項目のみMV化
      Object.keys(userLogObject).forEach((value) => {
        if (value != "undefined") {
          // 上位からpopulate先が存在するものがあるまでループを実行
          userLogObject[value].some((logObject) => {
            let topUserLog = logObject._id;
            // populateの妥当性をチェック
            if (checkPopulateAdequacy(topUserLog.model_name, topUserLog.populate)) {
              showLog(`Create MV (model_name: ${topUserLog.model_name}, populate: [${topUserLog.populate.join(',')}])`, preTime);
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
  let updateDocuments = function updateDocuments(modelName, query, update_document, callback) {
    preTime = performance.now();
    showLog('Starting updateDocuments' ,preTime);
    let updated_ids = [];
    modelList[modelName].
    find(query).
    exec(function (err, docs) {
      if (err) {
        console.log(err);
        callback(err, null);
      }
      // オリジナルコレクションの更新
      Object.keys(docs).forEach((value) => {
        // updated_atを更新
        if (!update_document.hasOwnProperty('updated_at')) {
          update_document.updated_at = new Date();
        }
        // 更新処理
        Object.assign(docs[value], update_document);
        docs[value].save((err, doc) => {
          if (err) {
            console.log(err);
            callback(err, null);
          }
          showLog(`updateDocuments | (ORIGINAL)Updated to \n${doc}` ,preTime);
          // 更新したidを格納
          updated_ids.push(doc._id);
        });
      });
      // オリジナルに関わるMVを更新
      updateMvDocuments(docs, modelName, query, update_document);
      callback(null, docs);
    });
  };

  module.exports = {
    // モデル本体
    modelList: modelList,
    // MVの作成
    createMvDocument: createMvDocument,
    // MV作成判断
    judgeCreateMv: judgeCreateMv,
    // オリジナル&MV更新処理
    updateDocuments: updateDocuments,
    // populateを検知したモデル
    populateModelList: populateModelList
  };
