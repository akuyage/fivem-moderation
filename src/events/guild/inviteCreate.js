const { Events } = require('discord.js');
const db = require('../../database/connect');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite) {
        if (!invite.guild) return;

        // Davet önbelleklemesini güncelle (SQLite tabanlı)
        db.prepare('INSERT OR REPLACE INTO Invites (code, inviterId, uses) VALUES (?, ?, ?)')
            .run(invite.code, invite.inviterId || null, invite.uses || 0);

        // Daily invite log kanalını kontrol et
        const row = db.prepare('SELECT dailyInviteLogChannel FROM GuildConfig WHERE guildId = ?').get(invite.guild.id);
        if (!row?.dailyInviteLogChannel) return;

        const channel = invite.guild.channels.cache.get(row.dailyInviteLogChannel)
            || await invite.guild.channels.fetch(row.dailyInviteLogChannel).catch(() => null);
        if (!channel) return;

        const inviter = invite.inviter ? `<@${invite.inviter.id}>` : 'Bilinmiyor';
        const maxUses = invite.maxUses ? invite.maxUses : 'Sınırsız';
        const expiresAt = invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Hiçbir zaman';

        channel.send({
            content: `📨 **Davet Oluşturuldu**\n` +
                     `Kod: \`${invite.code}\` • <${invite.url}>\n` +
                     `Oluşturan: ${inviter} • Maks. Kullanım: \`${maxUses}\` • Süre: ${expiresAt}`
        }).catch(() => {});
    }
};
