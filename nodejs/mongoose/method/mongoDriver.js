const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
require('dotenv').config();
const env = process.env;

const url = `mongodb://${env.DB_IP}`;
const dbName = env.DB_NAME;

let mongoinsertMany = async (collectionName, docs) => {
  let client;

  try {
    client = await MongoClient.connect(url, { useNewUrlParser: true });
    // console.log("Connected correctly to server");

    const db = client.db(dbName);

    // Insert multiple documents
    let res = await db.collection(collectionName).insertMany(docs);
    assert.equal(docs.length, res.insertedCount);
  } catch (err) {
    console.log(err.stack);
  }
  // Close connection
  client.close();
}

module.exports = {
  mongoinsertMany: mongoinsertMany
};
