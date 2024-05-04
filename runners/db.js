const Keyv = require('keyv');
const db = new Keyv('sqlite://nodes.db');

module.exports = { db }