// 外部ライブラリ
const express = require("express");
const bodyParser = require('body-parser');
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();
const env = process.env;
// 外部ファイル
const experiment = require('./experiment');
const lib = require('./lib');
const find = require('./method/find');
const mv = require('./method/materializedView');
const update = require('./method/update');
const modelBilder = require('./static/modelBilder');

const app = express();

// JOBTIME
let allJobStartTime, allJobEndTime;

// urlencodedとjsonは別々に初期化する
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


var server = app.listen(3000, () => {
    console.log("Node.js is listening to PORT:" + server.address().port);
});

app.get("/", (req, res, next) => {
  res.json({"code": "200", "message": "Server Runnning.", "serverTime": new Date()});
});

app.post("/test", (req, res, next) => {
  res.json({"code": "200"});
});

app.post("/start", (req, res, next) => {
  setGlobalVariable(req.body);
  allJobStartTime = performance.now();
  lib.showLog(`Start JOB now:${allJobStartTime}`, lib.topLog);
  res.json({"code": "200"});
});

app.post("/finish", (req, res, next) => {
  setGlobalVariable(req.body);
  allJobEndTime = performance.now();
  lib.showLog(`Fishish ALL JOB elapsedTime:${allJobEndTime-allJobStartTime} end: ${allJobEndTime}`, lib.topLog);
  res.json({"code": "200"});
});

app.get("/getModelList", (req, res, next) => {
  let modelList_str = Object.keys(modelBilder.modelList).join(',');
  res.json({"code": "200", "modelList": modelList_str, "populateModelList": modelBilder.populateModelList, "populateListForModel": modelBilder.populateListForModel});
});

app.post("/insertMany", (req, res, next) => {
  let requiredVariables = ["modelName", "document"];
  initPostMethod("insertMany", requiredVariables, req.body, (err) => {
    lib.showLog(`Starting insertMany Model: ${req.body.modelName}`, lib.topLog);
    if (err) return res.json(err);
    modelBilder.modelList[req.body.modelName].
    insertMany(req.body.document, (err, docs) => {
      if (err) {
        console.log(err);
        res.send(err);
        return;
      }
      res.json(docs);
    });
  });
});

app.post("/findOne", (req, res, next) => {
  let requiredVariables = ["modelName", "query", "populate"];
  initPostMethod("findOne", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    // 時間測定用のprocessIdを設定(グローバル)
    global.processId = createProcessId(req.body.processNum);
    find.findOneDocument(req.body, (err, docs) => {
      if (err) {
          // console.log(err);
          console.log("Error");
          res.send(err);
          return;
        }
        res.json(docs);
    });
  });
});

app.post("/update", (req, res, next) => {
  let requiredVariables = ["modelName", "query", "updateDocument"];
  initPostMethod("update", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    // 時間測定用のprocessIdを設定(var)
    req.body.processId = createProcessId(req.body.processNum);
    update.updateDocuments(req.body, (err, docs) =>  {
      if (err) {
        console.log(err);
        res.send(err);
        return;
      }
      res.json(docs);
    });
  });
});

app.post("/createMv", (req, res, next) => {
  let requiredVariables = ["modelName", "populate"];
  initPostMethod("createMv", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    mv.createMvDocument(req.body.modelName, req.body.populate, null, null, req.body.documentIds, (err, response) => {
      if (err) {
        res.json({"code": "error"});
      } else if (response) {
        res.json(response);
      } else {
        res.json({"code": "no response"});
      }
    });
  });
});

app.post("/createMvAll", (req, res, next) => {
  let requiredVariables = [];
  initPostMethod("createMvAll", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    mv.createMvDocumentAll((err, doc) => {
      if (err) return res.json(err);
      res.json(doc);
    });
  });
});

app.post("/judgeCreateMv", (req, res, next) => {
  let requiredVariables = [];
  initPostMethod("judgeCreateMv", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    mv.judgeCreateMv((err, docs) => {
      if (err) return res.json(err);
      res.json(docs);
    });
  });
});

app.post("/aggregateTestFineOne", (req, res, next) => {
  let requiredVariables = ["testId", "methodName"];
  initPostMethod("aggregateTestFineOne", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    experiment.aggregateTestFineOne(req.body.testId, req.body.methodName, (err, docs) => {
      if (err) return res.json(err);
      res.json(docs);
    });
  });
});

app.post("/aggregateTestUpdate", (req, res, next) => {
  let requiredVariables = ["testId", "methodName"];
  initPostMethod("aggregateTestUpdate", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    experiment.aggregateTestUpdate(req.body.testId, req.body.methodName, (err, docs) => {
      if (err) return res.json(err);
      res.json(docs);
    });
  });
});

app.post("/removeCollections", (req, res, next) => {
  let requiredVariables = [];
  initPostMethod("removeCollections", requiredVariables, req.body, (err) => {
    if (err) return res.json(err);
    experiment.removeCollections(req.body, (err, docs) => {
      if (err) return res.json(err);
      res.json(docs);
    });
  });
});

// グローバル変数をセット
function setGlobalVariable(body) {
  global.testId = body.testId;
  global.logLevel = body.logLevel ? body.logLevel : lib.topLog;
  global.processNum = body.processNum;
  global.processNumAll = body.processNumAll;
  global.testPattern = body.testPattern;
  global.preTimeGlobal = performance.now();
  if (body.isUseMv === 0) {
    global.isUseMv = body.isUseMv;
  } else {
    global.isUseMv = env.IS_USE_MV;
  }
}

// update用グローバル変数をセット
let setUpdateGlobalVariable = (body) => {
  global.query = body ? body.query : null;
}

// bodyの変数の妥当性をチェック
let CheckValidityOfVariables = (requiredVariables, body, callback) => {
  var hasNotDeclaration = false;
  Object.keys(requiredVariables).forEach((value) => {
    if (body[requiredVariables[value]] === undefined) {
      // 変数が宣言されていない場合, フラグを立てる
      hasNotDeclaration = true;
    }
  });
  // フラグが立っている場合はエラーを返す
  if (hasNotDeclaration) {
    let response = {
      "erroCode": "Variables Error",
      "message": `Require Variables are [${requiredVariables}].`};
      callback(response);
  } else {
    callback(null);
  }
}

// ポスト関数の初期化
let initPostMethod = (method, requiredVariables, body, callback) => {
  CheckValidityOfVariables(requiredVariables, body, (err) => {
    if (err) return callback(err);
    // グローバル変数をセット
    setGlobalVariable(body);
    // update用グローバル変数セット
    setUpdateGlobalVariable(method === 'update' ? body : null);
    // postメソッド名を埋め込み
    body.method = method;
    // ログを出力
    lib.showLog(`Request: ${JSON.stringify(body)}`, lib.normalLog);
    callback(null);
  });
}

// processId設定
let createProcessId = (processNum) => {
  let today = new Date();
  let processStr = processNum !== undefined ? ('0'+processNum).slice(-2) : `${today.getSeconds()}:${today.getMilliseconds()}`;
  return `${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}|${today.getHours()}:${today.getMinutes()}-${processStr}`;
}
