const db=require('better-sqlite3')('release/win-unpacked/resources/aleph.db');
try{ const v=require('sqlite-vec'); v.load(db); console.log('vec', db.prepare('SELECT vec_version()').get()); }catch(e){console.log('vec load fail', e.message)}
console.log('master', db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='vec_verses'").get());
try{ console.log('count', db.prepare('SELECT COUNT(*) as c FROM vec_verses').get()); }catch(e){console.log('count fail', e.message)}
