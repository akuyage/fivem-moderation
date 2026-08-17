const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamInviteReject' },
    async execute(interaction) {
        // teamInviteReject_teamId_targetUserId
        const args = interaction.customId.split('_');
        const teamId = parseInt(args[1]);
        const targetUserId = args[2];

        // Sadece davet edilen kişi butona tıklayabilir
        if (interaction.user.id !== targetUserId) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu daveti sadece ilgili kişi reddedebilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(teamId);
        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu daveti gönderen ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        
        // 24 saat kilit (86400 saniye) - Belirli bir ekibi reddettiği için sadece o ekip için kilit koyuyoruz.
        const lockedUntil = currentTime + 86400;
        
        // Eğer zaten REJECT_LOCK varsa güncelle, yoksa ekle (farklı zamanlarda davet gelmemiştir ama yine de replace)
        const existingLock = db.prepare('SELECT * FROM TeamLocks WHERE userId = ? AND teamId = ? AND lockType = ?').get(targetUserId, team.id, 'REJECT_LOCK');
        if (existingLock) {
            db.prepare('UPDATE TeamLocks SET lockedUntil = ? WHERE userId = ? AND teamId = ? AND lockType = ?').run(lockedUntil, targetUserId, team.id, 'REJECT_LOCK');
        } else {
            db.prepare('INSERT INTO TeamLocks (userId, teamId, lockType, lockedUntil) VALUES (?, ?, ?, ?)').run(targetUserId, team.id, 'REJECT_LOCK', lockedUntil);
        }

        // Mesajı güncelle
        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();

        await interaction.update({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0xf04747, // Kırmızı (Danger)
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10,
                                    content: `### ❌ Davet Reddedildi\n<@${targetUserId}>, **${team.name}** ekibinin davetini reddetti.`
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
