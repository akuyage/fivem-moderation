const { Events } = require('discord.js');
const db = require('../../database/connect');

module.exports = {
    name: Events.InviteDelete,
    async execute(invite) {
        if (!invite.guild) return;

        // Daveti veritabanından sil
        db.prepare('DELETE FROM Invites WHERE code = ?').run(invite.code);

        // Daily invite log kanalını kontrol et
        const row = db.prepare('SELECT dailyInviteLogChannel FROM GuildConfig WHERE guildId = ?').get(invite.guild.id);
        if (!row?.dailyInviteLogChannel) return;

        const channel = invite.guild.channels.cache.get(row.dailyInviteLogChannel)
            || await invite.guild.channels.fetch(row.dailyInviteLogChannel).catch(() => null);
        if (!channel) return;

        channel.send({
            content: `🗑️ **Davet Silindi**\nKod: \`${invite.code}\``
        }).catch(() => {});
    }
};
