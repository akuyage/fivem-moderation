const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamAddMember' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const targetUserId = interaction.values[0];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        if (!member) {
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Belirtilen kullanıcı sunucuda bulunamadı.') });
        }

        // Rolü zaten var mı?
        if (member.roles.cache.has(team.roleId)) {
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu kullanıcı zaten bu ekipte.') });
        }

        // Üye sınırı kontrolü
        const currentMembers = interaction.guild.roles.cache.get(team.roleId)?.members.size || 0;
        if (currentMembers >= team.memberLimit) {
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `Bu ekip için üye sınırına (${team.memberLimit}) ulaşıldı.`) });
        }

        try {
            await member.roles.add(team.roleId, `Ekibe eklendi - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);
            return interaction.editReply({ 
                ...embeds.success(interaction.guild?.name || 'FiveM Moderation', `${member} başarıyla **${team.name}** ekibine eklendi.`), 
                flags: (1 << 15)
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Üye eklenirken bir hata oluştu.') });
        }
    }
};
