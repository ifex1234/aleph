const db=require('better-sqlite3')('release/win-unpacked/resources/aleph.db');
const v=require('sqlite-vec');
v.load(db);
console.log('vec', db.prepare('SELECT vec_version()').get());
console.log('count', db.prepare('SELECT COUNT(*) as c FROM vec_verses').get());
console.log('model exists', require('fs').existsSync('release/win-unpacked/resources/models/qwen3-embedding-0.6b-int8/model_quantized.onnx'));
