var fs = require('fs');
var dir = './db';

if (!fs.existsSync(dir)){
  fs.mkdirSync(dir);
}

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/wallet.db');

const dbSchema = `
PRAGMA journal_mode; 

CREATE TABLE IF NOT EXISTS addresses (
  idx text NOT NULL PRIMARY KEY,
  addressHex text NOT NULL UNIQUE,
  balance text NOT NULL,
  prebalance text NOT NULL,
  nonce text UNIQUE,
  notificationState DEFAULT 0,
  attached boolean,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS address_transactions (
  id integer NOT NULL PRIMARY KEY,
  hash text NOT NULL,
  addressHex text NOT NULL,
  amount text NOT NULL,
  type integer NOT NULL,
  status integer NOT NULL,
  notificationState integer DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME,
  UNIQUE(hash,addressHex,type)
);

CREATE TABLE IF NOT EXISTS pending_webhooks (
  id integer NOT NULL PRIMARY KEY,
  data text NOT NULL,
  hookType integer NOT NULL,
  successful boolean,
  createdAt DATETIME,
  updatedAt DATETIME
);

CREATE INDEX IF NOT EXISTS addressHex_index ON addresses(addressHex);
CREATE INDEX IF NOT EXISTS notificationState_index ON addresses(notificationState);
CREATE INDEX IF NOT EXISTS hash_index ON address_transactions(hash);
CREATE INDEX IF NOT EXISTS addressHex_index ON address_transactions(addressHex);
CREATE INDEX IF NOT EXISTS updatedAt_index ON address_transactions(updatedAt);
CREATE INDEX IF NOT EXISTS notificationState_index ON address_transactions(notificationState);
CREATE INDEX IF NOT EXISTS successful_index ON pending_webhooks(successful);
`;

db.exec(dbSchema, (err) => {
  if (err) {
    console.log(`DB Migration failed due to error!`);
    console.log(err);
    process.exit(1);
  } else {
    console.log(`DB Migration done!`);
  }
});

