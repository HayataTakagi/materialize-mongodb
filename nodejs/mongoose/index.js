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

app.post("/findOne", function(req, res, next){
  req.body.method = "findeOne";
  console.log(req.body);
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

app.post("/updateOne", function(req, res, next){
  req.body.method = "updateOne";
  console.log(req.body);
  main.modelList[req.body.model_name].
  updateOne(req.body.query, req.body.document).
  exec(function (err, doc) {
    if (err) {
      console.log(err);
      res.send(err);
    }
    res.json(doc);
  });
});

app.post("/createMv", function(req, res, next){
  req.body.method = "createMv";
  console.log(req.body);
  main.createMvDocument(req.body.model_name, req.body.populate, req.body.id_array);
  res.json({"code": "300"});
});

app.post("/judgeCreateMv", function(req, res, next){
  req.body.method = "judgeCreateMv";
  console.log(req.body);
  main.judgeCreateMv(function(err, docs){
    if (err) res.json(err);
    res.json(docs);
  });
});
