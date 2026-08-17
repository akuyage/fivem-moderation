const db = require('./connect');

const stmts = {
    addPunish: db.prepare('INSERT INTO Punishments (userId, moderatorId, type, reason, timestamp, duration, active) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    addStaffStatsIgnore: db.prepare('INSERT OR IGNORE INTO StaffStats (userId) VALUES (?)'),
    incrementStaffPunishments: db.prepare('UPDATE StaffStats SET punishmentsGiven = punishmentsGiven + 1 WHERE userId = ?'),
    getPunishmentsByType: db.prepare('SELECT * FROM Punishments WHERE userId = ? AND type = ? ORDER BY timestamp DESC'),
    getPunishmentsAll: db.prepare('SELECT * FROM Punishments WHERE userId = ? ORDER BY timestamp DESC'),
    getActivePunish: db.prepare('SELECT * FROM Punishments WHERE userId = ? AND type = ? AND active = 1 ORDER BY timestamp DESC LIMIT 1'),
    removeActivePunish: db.prepare('UPDATE Punishments SET active = 0 WHERE userId = ? AND type = ? AND active = 1'),
    getBlacklist: db.prepare('SELECT * FROM Blacklist WHERE userId = ?'),
    addBlacklist: db.prepare('INSERT OR REPLACE INTO Blacklist (userId, reason, moderatorId, timestamp) VALUES (?, ?, ?, ?)'),
    removeBlacklist: db.prepare('DELETE FROM Blacklist WHERE userId = ?')
};

module.exports = {
    addPunish: (userId, moderatorId, type, reason, duration = null) => {
        const info = stmts.addPunish.run(userId, moderatorId, type, reason, Date.now(), duration, 1);
        
        // Yetkili istatistiğini artır
        if (moderatorId && moderatorId !== 'SYSTEM') {
            stmts.addStaffStatsIgnore.run(moderatorId);
            stmts.incrementStaffPunishments.run(moderatorId);
        }

        return info.lastInsertRowid;
    },
    getPunishments: (userId, type = null) => {
        if (type) {
            return stmts.getPunishmentsByType.all(userId, type);
        }
        return stmts.getPunishmentsAll.all(userId);
    },
    getActivePunish: (userId, type) => {
        return stmts.getActivePunish.get(userId, type);
    },
    removeActivePunish: (userId, type) => {
        return stmts.removeActivePunish.run(userId, type);
    },
    isBlacklisted: (userId) => {
        const result = stmts.getBlacklist.get(userId);
        return !!result;
    },
    addBlacklist: (userId, reason, moderatorId) => {
        return stmts.addBlacklist.run(userId, reason, moderatorId, Date.now());
    },
    removeBlacklist: (userId) => {
        return stmts.removeBlacklist.run(userId);
    }
};

