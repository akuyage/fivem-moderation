const { Events } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

const stmts = {
    getUser: db.prepare('SELECT * FROM Users WHERE userId = ?'),
    createUser: db.prepare('INSERT INTO Users (userId) VALUES (?)'),
    updateUser: db.prepare('UPDATE Users SET messageCount = ?, xp = ?, level = ? WHERE userId = ?')
};

module.exports = {
    name: Events.MessageCreate,
    execute(message) {
        if (message.author.bot || !message.guild) return;

        // Kullanıcıyı veritabanında oluştur/getir
        let user = stmts.getUser.get(message.author.id);
        if (!user) {
            stmts.createUser.run(message.author.id);
            user = { userId: message.author.id, messageCount: 0, voiceTime: 0, level: 1, xp: 0, invites: 0 };
        }

        const xpGained = Math.floor(Math.random() * 11) + 15; // 15-25 arası rastgele XP
        let newXp = user.xp + xpGained;
        let newLevel = user.level;
        let newMessageCount = user.messageCount + 1;

        const xpRequired = newLevel * 1000;

        if (newXp >= xpRequired) {
            newLevel += 1;
            newXp -= xpRequired; // Fazla XP'yi bir sonraki levele aktar
            message.channel.send(`🎉 Tebrikler <@${message.author.id}>, **${newLevel}.** seviyeye ulaştın!`).catch(() => {});
        }

        stmts.updateUser.run(newMessageCount, newXp, newLevel, message.author.id);
    }
};

