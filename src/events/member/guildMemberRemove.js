const { Events } = require('discord.js');
const db = require('../../database/connect');
const config = require('../../../config.json');
const voiceTracker = require('./voiceTracker');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Hafıza Sızıntısını Önleme (Kullanıcı ses kanalındayken atılmışsa Timer temizle)
        voiceTracker.cleanupUser(member.id);

        // Veritabanına Logla (Daily Report için)
        db.prepare(`
            INSERT INTO JoinLogs (userId, isLeave, timestamp)
            VALUES (?, ?, ?)
        `).run(member.id, 1, Date.now());

        // InviteStats Güncelle ve Son Davet Edeni Bul
        const lastJoin = db.prepare('SELECT inviterId, inviteCode FROM JoinLogs WHERE userId = ? AND isLeave = 0 ORDER BY timestamp DESC').get(member.id);
        if (lastJoin && lastJoin.inviterId !== 'Bilinmiyor') {
            db.prepare('UPDATE InviteStats SET leaves = leaves + 1 WHERE userId = ?').run(lastJoin.inviterId);
        }

        // Log Kanallarına Gönder
        const leavedLogChannel = member.guild.channels.cache.get(config.channels.leavedLogChannel);
        
        const avatar = member.user.displayAvatarURL({ dynamic: true });
        const inviter = lastJoin && lastJoin.inviterId !== 'Bilinmiyor' ? `<@${lastJoin.inviterId}>` : 'Bilinmiyor';
        const inviteCode = lastJoin && lastJoin.inviteCode ? lastJoin.inviteCode : 'Bilinmiyor';
        
        const containerComponents = [
            {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: `# Sunucudan Ayrıldı\n${member.user.username} az önce sunucudan çıkış yaptı.`
                    }
                ],
                accessory: {
                    type: 11,
                    media: { url: avatar }
                }
            },
            { type: 14 },
            {
                type: 10,
                content: `### Kullanıcı Bilgileri\n> **Kullanıcı:** <@${member.id}> (\`${member.id}\`)\n> **Davet Eden:** ${inviter}\n> **Davet Kodu:** \`${inviteCode}\`\n> **Hesap Tarihi:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
            },
            { type: 14 },
            {
                type: 10,
                content: `-# Powered By akuyage`
            }
        ];

        if (leavedLogChannel) {
            await leavedLogChannel.send({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0x95a5a6, components: containerComponents }]
            }).catch(() => {});
        }

        // Bilet Kontrolü (Eski kodun devamı)
        const openTickets = db.prepare('SELECT * FROM Tickets WHERE userId = ? AND status = ?').all(member.id, 'open');
        if (openTickets.length > 0) {
            const leaveComponents = [
                {
                    type: 10,
                    content: `# Kullanıcı Ayrıldı\nBu Ticket'i oluşturan kullanıcı (<@${member.id}>) sunucudan ayrıldı.\n\n> Bilet boşa çıkmıştır, değerlendirmeyi beklemeden kapatabilirsiniz.`
                }
            ];

            for (const ticket of openTickets) {
                try {
                    const ticketChannel = member.guild.channels.cache.get(ticket.channelId);
                    if (ticketChannel) {
                        await ticketChannel.send({
                            flags: (1 << 15),
                            components: [{ type: 17, accent_color: 0xf04747, components: leaveComponents }]
                        });
                    }
                } catch (error) {}
            }
        }
    }
};
