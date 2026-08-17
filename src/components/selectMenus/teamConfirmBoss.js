const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamConfirmBoss' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const newBossId = interaction.values[0];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const member = await interaction.guild.members.fetch(newBossId).catch(() => null);
        if (!member) {
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Seçilen kullanıcı sunucuda bulunamadı.') });
        }

        // Veritabanını güncelle
        db.prepare('UPDATE Teams SET leaderId = ? WHERE id = ?').run(newBossId, parseInt(teamId));

        // Kullanıcıya rolü ver (eğer yoksa)
        if (!member.roles.cache.has(team.roleId)) {
            await member.roles.add(team.roleId, `Boss ataması - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`).catch(() => {});
        }

        return interaction.editReply({
            flags: (1 << 15),
            components: [
                {
                    type: 17,
                    accent_color: 0x43b581,
                    components: [
                        {
                            type: 10,
                            content: `# ✅ Boss Değiştirildi\n**${team.name}** ekibinin yeni boss'u artık ${member}!`
                        }
                    ]
                }
            ]
        });
    }
};
