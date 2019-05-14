// 外部ライブラリのインポート
const { PerformanceObserver, performance } = require('perf_hooks');
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

// findOne
let findOneDocument = function findOneDocument (body, callback) {
  showLog('Starting findOneDocument' , lib.topLog);
  modelList[body.modelName].
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

module.exports = {
  // Method
  // findOne
  findOneDocument: findOneDocument,
};
