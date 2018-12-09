var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
var db = mongoose.connection;
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
const START_MS = new Date().getTime();

db.on('error', console.error.bind(console, 'connection error:'));



db.once('open', function() {
showLog('[Query Start]');

  const schemaSeeds = {
    "personSchema": {
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    },"storySchema": {
      _id: Schema.Types.ObjectId,
      author: { type: Schema.Types.ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
    },
  };

  let mvSchemaSeeds = {
    "personSchema": {
      _id: Schema.Types.ObjectId,
      name: String,
      age: Number,
      stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }]
    },"storySchema": {
      _id: Schema.Types.ObjectId,
      author: { type: Schema.Types.ObjectId, ref: 'Person' },
      title: String,
      fans: [{ type: Schema.Types.ObjectId, ref: 'Person' }]
    },
  };

  // オリジナルスキーマの作成
  const schemaList = {};
  schemaBilder(schemaSeeds, schemaList);

  // mvスキーマの定義
  let mvSchemaList = {};
  mvSchemaBilder(schemaSeeds, mvSchemaList);


  // プリフックの定義
  // Object.keys(schemaList).forEach(function(value) {
  //   schemaList[value].pre('findOne', function(next) {
  //     try {
  //       console.log("--------pre_Start--------");
  //       if (isMaterialized(this)) {
  //         var self = this;
  //         rewriteQueryToMv(self, function(err) {
  //           next(err);
  //         });
  //       }
  //       console.log("--------pre_End--------");
  //       next();
  //     } catch (err) {
  //       next(err);
  //     }
  //   });
  // });

  // モデル定義
  let modelList = {},
      mvModelList = {};
  modelBilder(schemaList, modelList);
  modelBilder(mvSchemaList, mvModelList, true)

  // クエリ作成
  modelList['Story'].
  findOne({ title: 'Sotsuken' }).
  populate('author').
  exec(function (err, story) {
    if (err) return console.log(err);
    console.log(story);
  });

  mvModelList['Story'].
  findOne({ title: 'Sotsuken_mv' }).
  exec(function (err, story) {
    if (err) return console.log(err);
    console.log(story);
  });

  // MV参照へのクエリ書き換え
  function rewriteQueryToMv(query, callback) {
    try {
      // モデル情報の書き換え
      query.model = MvStory;
      // スキーマ情報書き換え
      query.schema = mvSchemaList['storySchema'];
      // コレクション情報書き換え
      query._collection.collection = db.collection('mvstories');
      // クエリ条件文情報書き換え
      query._conditions.title = "Sotsuken_mv";
      query._mongooseOptions = "";
    } catch (err) {
      callback(err);
    }
  }

  // MV化されているかの判別
  function isMaterialized(query) {
    return true;
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
      // Seedからmvスキーマを作成
      mvSchemaObjects[value] = Schema(mvSchemaSeeds[value]);
      showLog('[Finish]mvSchemaBilder');
    });
  }

  // refがあるスキーマをref先のスキーマに置き換える
  // ref先のrefは置き換えない
  function replaceRefSchema(obj) {
    Object.keys(obj).forEach(function(value) {
      if (typeof obj[value] != "object") {
        // String, Number, _id 等を弾く
        return;
      } else {
        if(obj[value].hasOwnProperty('ref')) {
          // 参照型の場合埋め込み型に書き換える
          // mvschemaを自動生成した際ここでオリジナルのseedが書き換わってしまう
          obj[value] = completeAssign({}, schemaSeeds[getSchemaName(obj[value].ref)]);
        } else {
          // 探索を続ける
          replaceRefSchema(obj[value]);
        }
      }
    });
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

  // モデル名からスキーマ名を取得
  function getSchemaName(modelName) {
    return modelame.toLowerCase() + 'Schema';
  }

  // スキーマ名からモデル名を取得
  function getModelName(schemaName) {
    let modelName = schemaName.slice(0, -6);  // 'Schema'を削除
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);  // 先頭文字を大文字化
  }

  // 経過時間,呼び出し元メソッド,メッセージをログ表示する
  function showLog(msg) {
    let now_time = new Date(),
        elapsed_time = (now_time.getTime() - START_MS) / 1000;
    if (showLog.caller.name) {
      console.log('[' + getNowTime() + '|' + elapsed_time + ']'  + showLog.caller.name + ' | ' + msg);
    } else {
      console.log('[' + getNowTime() + '|' + elapsed_time + ']' + msg);
    }
  }

  // 現在時刻をHH:mm:SSで返す
  function getNowTime() {
    let now_time = new Date(),
        now_hour = now_time.getHours() + 9 ,
        now_minute = now_time.getMinutes(),
        now_second = now_time.getSeconds();
    return ('0'+now_hour).slice(-2) + ':' + ('0'+now_minute).slice(-2) + ':' + ('0'+now_second).slice(-2);

  }

  // 記述子を完全にコピーする代入関数
function completeAssign(target, ...sources) {
  showLog(completeAssign.caller.name);
  sources.forEach(source => {
    let descriptors = Object.keys(source).reduce((descriptors, key) => {
      descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
      return descriptors;
    }, {});
    // // デフォルトで、Object.assign は列挙可能なシンボルもコピーします。
    Object.getOwnPropertySymbols(source).forEach(sym => {
      let descriptor = Object.getOwnPropertyDescriptor(source, sym);
      if (descriptor.enumerable) {
        descriptors[sym] = descriptor;
      }
    });
    Object.defineProperties(target, descriptors);
  });
  return target;
}

  showLog('[Query End]');
});
