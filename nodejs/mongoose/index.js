// 外部ライブラリ
const express = require("express");
const bodyParser = require('body-parser');
const { PerformanceObserver, performance } = require('perf_hooks');
require('dotenv').config();
const env = process.env;
// 外部ファイル
const main = require('./main');
const lib = require('./../lib');


const app = express();

// JOBTIME
var allJobStartTime, allJobEndTime;

// urlencodedとjsonは別々に初期化する
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


var server = app.listen(3000, function(){
    console.log("Node.js is listening to PORT:" + server.address().port);
});

app.get("/", function(req, res, next){
  res.json({"code": "200", "message": "Server Runnning.", "serverTime": new Date()});
});

app.post("/test", function(req, res, next){
  res.json({"code": "200"});
});

app.post("/start", function(req, res, next){
  setGlobalVariable(req.body);
  allJobStartTime = performance.now();
  lib.showLog(`Start JOB now:${allJobStartTime}`, null, lib.topLog);
  res.json({"code": "200"});
});

app.post("/finish", function(req, res, next){
  setGlobalVariable(req.body);
  allJobEndTime = performance.now();
  lib.showLog(`Fishish ALL JOB elapsedTime:${allJobEndTime-allJobStartTime} end: ${allJobEndTime}`, null, lib.topLog);
  res.json({"code": "200"});
});

app.get("/getModelList", function(req, res, next){
  let modelList_str = Object.keys(main.modelList).join(',');
  let ex1ModelList_str = Object.keys(main.ex1ModelList).join(',');
  res.json({"code": "200", "modelList": modelList_str, "ex1ModelList": ex1ModelList_str,  "populateModelList": main.populateModelList, "populateListForModel": main.populateListForModel});
});

app.post("/insertMany", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "insertMany";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  if (!Array.isArray(req.body.document)) {
    res.json({"code": "400", "message": "Document must be Array!"});
    return;
  }
  main.modelList[req.body.modelName].
  insertMany(req.body.document, (err, docs) => {
    if (err) {
      console.log(err);
      res.send(err);
      return;
    }
    res.json(docs);
  });
});

app.post("/findOne", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "findeOne";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.modelList[req.body.modelName].
  findOne(req.body.query).
  populate(req.body.populate).
  exec(function (err, doc) {
    if (err) {
      console.log(err);
      res.send(err);
      return;
    }
    res.json(doc);
  });
});

app.post("/findOneTest", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "findeOneTest";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.findOneTest(req.body, (err, docs) => {
    if (err) {
        // console.log(err);
        console.log("Error");
        res.send(err);
        return;
      }
      res.json(docs);
  });
});

app.post("/update", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "update";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.updateDocuments(req.body, function(err, docs) {
    if (err) {
      console.log(err);
      res.send(err);
      return;
    }
    res.json(docs);
  })
});

app.post("/createMv", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "createMv";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.createMvDocument(req.body.modelName, req.body.populate, req.body.documentIds);
  res.json({"code": "300"});
});

app.post("/createMvAll", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "createMvAll";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.createMvDocumentAll((err, doc) => {
    if (err) return res.json(err);
    res.json(doc);
  });
});

app.post("/judgeCreateMv", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "judgeCreateMv";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.judgeCreateMv(function(err, docs){
    if (err) return res.json(err);
    res.json(docs);
  });
});

app.post("/aggregateTest", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "aggregateTest";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.aggregateTest(req.body.testId, req.body.methodName, function(err, docs){
    if (err) return res.json(err);
    res.json(docs);
  });
});

app.post("/removeCollections", function(req, res, next){
  setGlobalVariable(req.body);
  req.body.method = "removeCollections";
  lib.showLog(`Request: ${JSON.stringify(req.body)}`, null, lib.normalLog);
  main.removeCollections(req.body, function(err, docs){
    if (err) return res.json(err);
    res.json(docs);
  });
});

function setGlobalVariable(body) {
  global.testId = body.testId;
  global.logLevel = body.logLevel ? body.logLevel : lib.topLog;
  global.processNum = body.processNum;
  global.processNumAll = body.processNumAll;
}
