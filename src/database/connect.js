const Database = require('better-sqlite3');
const path = require('path');

// SQLite veritabanı dosyasına bağlan
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');
const db = new Database(dbPath); // Detaylı loglama için , { verbose: console.log } eklenebilir

// Performans için WAL (Write-Ahead Logging) modunu açıyoruz
db.pragma('journal_mode = WAL');

module.exports = db;
