const { Events, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

const voiceTimers = new Map();

const stmts = {
    getUserVoice: db.prepare('SELECT voiceTime FROM Users WHERE userId = ?'),
    insertUserVoice: db.prepare('INSERT INTO Users (userId, voiceTime) VALUES (?, ?)'),
    updateUserVoice: db.prepare('UPDATE Users SET voiceTime = voiceTime + ? WHERE userId = ?'),
    insertStaffStatsIgnore: db.prepare('INSERT OR IGNORE INTO StaffStats (userId) VALUES (?)'),
    updateStaffStatsVoice: db.prepare('UPDATE StaffStats SET voiceTime = voiceTime + ? WHERE userId = ?')
};

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        // Kanala ilk Katılma
        if (!oldState.channelId && newState.channelId) {
            voiceTimers.set(member.id, Date.now());
        }
        // Kanaldan Ayrılma
        else if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceTimers.get(member.id);
            if (joinTime) {
                const duration = Date.now() - joinTime;
                voiceTimers.delete(member.id);

                let user = stmts.getUserVoice.get(member.id);
                if (!user) {
                    stmts.insertUserVoice.run(member.id, duration);
                } else {
                    stmts.updateUserVoice.run(duration, member.id);
                }

                // Eğer yetkiliyse (Staff rolü veya Permission) StaffStats'a da ekle
                const staffRoleId = config.roles?.staff;
                const isStaff = (staffRoleId && member.roles.cache.has(staffRoleId)) ||
                               member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
                               member.permissions.has(PermissionFlagsBits.ManageMessages);

                if (isStaff) {
                    stmts.insertStaffStatsIgnore.run(member.id);
                    stmts.updateStaffStatsVoice.run(duration, member.id);
                }
            }
        }
    },
    // Memory leak önlemek için yardımcı fonksiyon
    cleanupUser: function(userId) {
        if (voiceTimers.has(userId)) {
            voiceTimers.delete(userId);
            // Sadece bellekten siliyoruz, çıkış olarak hesaplamıyoruz
            // çünkü adam doğrudan atılmış veya banlanmış olabilir.
        }
    }
};

