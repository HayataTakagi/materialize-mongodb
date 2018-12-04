let mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/nodedb', { useNewUrlParser: true });
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
  console.log("we're connected!");

  let kittySchema = new mongoose.Schema({
    name: String
  });
  kittySchema.methods.speak = function () {
  let greeting = this.name
    ? "Meow name is " + this.name
    : "I don't have a name";
  console.log(greeting);
  }
  kittySchema.pre('find', function(next) {
    console.log("--------pre_Start--------");
    console.log(this._conditions);
    this._conditions.name = 'takagi';
    // console.log(this);
    console.log(this._conditions);
    console.log("--------pre_End--------");
    next();
  })
  // モデル定義
  let Kitten = mongoose.model('Kitten', kittySchema);

  let query = Kitten.where({name: 'fluffy'}).limit(5);


  query.find(function (err, kittens) {
  if (err) return console.error(err);
  console.log(kittens);
})
});
