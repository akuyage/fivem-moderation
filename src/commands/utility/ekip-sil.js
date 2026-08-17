const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekip-sil')
        .setDescription('Bir ekibi veritabanından siler.')
        .addIntegerOption(option => option.setName('id').setDescription("Silinecek ekip ID'si").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const teamId = interaction.options.getInteger('id');
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(teamId);
        
        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu ID\'ye sahip bir ekip bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 15) });

        db.prepare('DELETE FROM Teams WHERE id = ?').run(teamId);

        // Önce mesajı editle (eğer komut silinecek kanalın içinde kullanıldıysa webhook çökmesin diye)
        try {
            await interaction.editReply({
                flags: (1 << 15),
                components: [{
                    type: 17,
                    accent_color: 0xf04747,
                    components: [
                        { type: 10, content: `# Ekip Silindi` },
                        { type: 14 },
                        { type: 10, content: `> **Ekip:** ${team.name}\n> **ID:** ${team.id}` },
                        { type: 14 },
                        { type: 10, content: `-# Powered By akuyage` }
                    ]
                }]
            });
        } catch (e) {
            console.error('[EKIP-SIL] editReply hatası:', e);
        }

        // Sonra rolü ve kanalı sil
        const role = interaction.guild.roles.cache.get(team.roleId);
        if (role) await role.delete().catch(() => {});

        if (team.channelId) {
            const channel = interaction.guild.channels.cache.get(team.channelId);
            if (channel) await channel.delete().catch(() => {});
        }
    }
};
