// // モデルの宣言
const Model = require('./populate');
const express = require("express");
const bodyParser = require('body-parser');

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
  res.json({"code": "200", "message": "Server Runnning."});
});

app.post("/findOne", function(req, res, next){
  console.log(req.body);
  Model[req.body.model_name].
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

app.get("/person", function(req, res, next){
  Model['Person'].
  findOne({ name: 'takagi' }).
  exec(function (err, person) {
    if (err) return console.log(err);
    res.json(person);
  });
});
