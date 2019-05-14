const mongoose = require('mongoose');
// Mngooseのバッファの設定
mongoose.set('bufferCommands', false);
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId,
Mixed = Schema.Types.Mixed;

const seedObjects = {
  "exASchema": {
    "personSchema": {
      _id: Number,
      name: String,
      age: Number,
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "storySchema": {
      _id: Number,
      author: { type: Number, ref: 'Person' },
      title: String,
      fans: [{ type: Number, ref: 'Person' }],
      publication: { type: Number, ref: 'Publisher' },
      comments : [{ type: Number, ref: 'Comment' }],
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "commentSchema": {
      _id: Number,
      speak: {
        speaker: { type: Number, ref: 'Person' },
        comment: String
      },
      story: { type: Number, ref: 'Story' },
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "publisherSchema": {
      _id: Number,
      weather: String,
      date: Date,
      name: String,
      address: String,
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }
  }
}

const mvSeedObjects = {
  "exASchema": {
    "personSchema": {
      _id: Number,
      name: String,
      age: Number,
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "storySchema": {
      _id: Number,
      author: { type: Number, ref: 'Person' },
      title: String,
      fans: [{ type: Number, ref: 'Person' }],
      publication: { type: Number, ref: 'Publisher' },
      comments : [{ type: Number, ref: 'Comment' }],
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "commentSchema": {
      _id: Number,
      speak: {
        speaker: { type: Number, ref: 'Person' },
        comment: String
      },
      story: { type: Number, ref: 'Story' },
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }, "publisherSchema": {
      _id: Number,
      weather: String,
      date: Date,
      name: String,
      address: String,
      created_at: {type: Date, default: Date.now},
      updated_at: {type: Date, default: Date.now},
    }
  }
}

const logSeedObjects = {
  "userlogSchema": {
    _id: ObjectId,
    elapsed_time: Number,
    options: Mixed,
    collection_name: String,
    ori_model_name: String,
    model_name: String,
    method: String,
    query: Mixed,
    populate: [ String ],
    is_rewrited: Boolean,
    test_id: Number,
    process_id: String,
    date: {type: Date, default: Date.now},
  }, "mvlogSchema": {
    _id: ObjectId,
    original_model: String,
    original_coll: String,
    populate: [ String ],
    populate_model: [ String ],
    is_deleted: Boolean,
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now},
  },
}

module.exports = {
  seedObjects: seedObjects,
  mvSeedObjects: mvSeedObjects,
  logSeedObjects: logSeedObjects
};
