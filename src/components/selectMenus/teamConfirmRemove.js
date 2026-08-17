const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamConfirmRemove' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const targetUserId = interaction.values[0];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!member) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Seçilen kullanıcı sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        // Rolü var mı kontrol et
        if (!member.roles.cache.has(team.roleId)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu kullanıcı zaten bu ekipte değil.'), flags: (1 << 6) | (1 << 15) });
        }

        // Lider veya OG çıkartılamasın
        if (member.id === team.leaderId) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Ekip Bossu ekipten bu şekilde çıkartılamaz. Önce Boss devredilmelidir.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        try {
            await member.roles.remove(team.roleId, `Ekipten çıkartıldı - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);
            return interaction.editReply({
                flags: (1 << 15),
                components: [
                    {
                        type: 17,
                        accent_color: 0x43b581,
                        components: [
                            {
                                type: 10,
                                content: `# ✅ Üye Çıkartıldı\n${member} başarıyla **${team.name}** ekibinden çıkartıldı.`
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Üye çıkartılırken bir hata oluştu.') });
        }
    }
};
