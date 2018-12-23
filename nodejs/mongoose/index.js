// モデルの宣言
var Model = require('./populate2');

// Model.modelList['Person'].
// findOne({ name: 'takagi' }).
// limit(1).
// exec(function (err, person) {
//   if (err) return console.log(err);
//   showLog('クエリ結果');
//   console.log(person);
// });
// console.log(Model['']);
Model['Person'].
findOne({ name: 'takagi' }).
limit(1).
exec(function (err, person) {
  if (err) return console.log(err);
  console.log('クエリ結果');
  console.log(person);
});
