const START_MS = new Date().getTime();

module.exports = {
  // 経過時間,呼び出し元メソッド,メッセージをログ表示する
  showLog: function showLog(msg) {
    let now_time = new Date(),
        elapsed_time = ((now_time.getTime() - START_MS) / 1000).toFixed(3);
    if (showLog.caller.name) {
      console.log('[' + getNowTime() + '|' + elapsed_time + ']'  + showLog.caller.name + ' | ' + msg);
    } else {
      console.log('[' + getNowTime() + '|' + elapsed_time + ']' + msg);
    }
  },

  // 記述子を完全にコピーする代入関数
  completeAssign: function (target, ...sources) {
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
  },

  // モデル名からスキーマ名を取得
  getSchemaName: function (modelName) {
    return modelName.toLowerCase() + 'Schema';
  },

  // スキーマ名からモデル名を取得
  getModelName: function (schemaName) {
    let modelName = schemaName.slice(0, -6);  // 'Schema'を削除
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);  // 先頭文字を大文字化
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
