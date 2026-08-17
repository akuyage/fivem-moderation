const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamInviteAccept' },
    async execute(interaction) {
        // teamInviteAccept_teamId_targetUserId
        const args = interaction.customId.split('_');
        const teamId = parseInt(args[1]);
        const targetUserId = args[2];

        // Sadece davet edilen kişi butona tıklayabilir
        if (interaction.user.id !== targetUserId) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu davet senin için gönderilmemiş.'), flags: (1 << 6) | (1 << 15) });
        }

        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(teamId);
        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu daveti gönderen ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const role = interaction.guild.roles.cache.get(team.roleId);
        if (!role) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekibin rolü bulunamadı, silinmiş olabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        // Ekip üye sınırını kontrol et
        const memberCount = role.members.size;
        if (memberCount >= team.memberLimit) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `Bu ekip üye sınırına (${team.memberLimit}) ulaştığı için daveti kabul edemezsin.`), flags: (1 << 6) | (1 << 15) });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        
        // Yeniden kilit kontrolü
        const globalLock = db.prepare('SELECT * FROM TeamLocks WHERE userId = ? AND lockType = ? AND lockedUntil > ?').get(targetUserId, 'JOIN_LOCK', currentTime);
        if (globalLock) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `Yakın zamanda bir ekibe girdiğin/çıktığın için <t:${globalLock.lockedUntil}:R> başka bir ekibe katılamazsın.`), flags: (1 << 6) | (1 << 15) });
        }

        // Hemen deferUpdate yap (3 saniye limiti aşmamak için)
        await interaction.deferUpdate();

        // Rolü ver
        await interaction.member.roles.add(role.id, 'Ekip davetini kabul etti').catch(() => {});

        // 24 saat kilit (86400 saniye)
        const lockedUntil = currentTime + 86400;
        db.prepare('INSERT INTO TeamLocks (userId, teamId, lockType, lockedUntil) VALUES (?, ?, ?, ?)').run(targetUserId, team.id, 'JOIN_LOCK', lockedUntil);

        // Mesajı güncelle
        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();

        await interaction.editReply({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x43b581, // Yeşil (Success)
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10,
                                    content: `### ✅ Davet Kabul Edildi\n<@${targetUserId}>, **${team.name}** ekibine katıldı!`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: { url: guildIcon }
                            }
                        }
                    ]
                }
            ]
        }).catch(() => {});
    }
};
