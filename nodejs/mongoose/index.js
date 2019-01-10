// // モデルの宣言
const main = require('./populate');
const express = require("express");
const bodyParser = require('body-parser');
const lib = require('./../lib');
require('dotenv').config();
const env = process.env;

const app = express();

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

app.get("/getModelList", function(req, res, next){
  let modelList_str = Object.keys(main.modelList).join(',');
  let ex1ModelList_str = Object.keys(main.ex1ModelList).join(',');
  res.json({"code": "200", "modelList": modelList_str, "ex1ModelList": ex1ModelList_str,  "populateModelList": main.populateModelList, "populateListForModel": main.populateListForModel});
});

app.post("/insertMany", function(req, res, next){
  req.body.method = "insertMany";
  console.log(req.body);
  // test_idをグローバル変数として定義
  if (req.body.test_id) global.test_id = req.body.test_id;
  if (!Array.isArray(req.body.document)) {
    res.json({"code": "400", "message": "Document must be Array!"});
    return;
  }
  main.modelList[req.body.model_name].
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
  req.body.method = "findeOne";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.modelList[req.body.model_name].
  findOne(req.body.query).
  populate(req.body.populate).
  exec(function (err, doc) {
    if (err) {
      console.log(err);
      res.send(err);
    }
    res.json(doc);
  });
});

app.post("/findOneTest", function(req, res, next){
  req.body.method = "findeOneTest";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.findOneTest(req.body, (err, docs) => {
    if (err) {
        // console.log(err);
        console.log("Error");
        res.send(err);
      }
      res.json(docs);
  });
});

app.post("/update", function(req, res, next){
  req.body.method = "update";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.updateDocuments(req.body.model_name, req.body.query, req.body.document, function(err, docs) {
    if (err) {
      console.log(err);
      res.send(err);
    }
    res.json(docs);
  })
});

app.post("/createMv", function(req, res, next){
  req.body.method = "createMv";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.createMvDocument(req.body.model_name, req.body.populate, req.body.id_array);
  res.json({"code": "300"});
});

app.post("/judgeCreateMv", function(req, res, next){
  req.body.method = "judgeCreateMv";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.judgeCreateMv(function(err, docs){
    if (err) res.json(err);
    res.json(docs);
  });
});

app.post("/aggregateTest", function(req, res, next){
  req.body.method = "aggregateTest";
  console.log(req.body);
  main.aggregateTest(req.body.test_id, req.body.method_name, function(err, docs){
    if (err) res.json(err);
    res.json(docs);
  });
});

app.post("/experimentById", function(req, res, next){
  req.body.method = "experiment";
  console.log(req.body);
  // test_idをグローバル変数として定義
  global.test_id = req.body.test_id;
  main.experimentById(req.body.test_id,
    req.body.method_name,
    req.body.model_name,
    req.body.min_id,
    req.body.max_id,
    req.body.populate,
    req.body.trials,
    function(err, docs){
    if (err) res.json(err);
    res.json(docs);
  });
});

app.post("/createEx1Collection", function(req, res, next){
  req.body.method = "createEx1Collection";
  console.log(req.body);
  main.createEx1Collection(function(err, docs){
    if (err) res.json(err);
    res.json(docs);
  });
});
