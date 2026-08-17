const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekip-bilgi')
        .setDescription('Bir ekibin bilgilerini gösterir.')
        .addIntegerOption(option => option.setName('id').setDescription('Ekip ID\'si').setRequired(true)),

    async execute(interaction) {
        const teamId = interaction.options.getInteger('id');
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(teamId);
        
        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu ID\'ye sahip bir ekip bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply();

        const role = interaction.guild.roles.cache.get(team.roleId);
        const memberList = role ? role.members.map(m => `<@${m.id}>`).join(', ') || 'Üye yok' : 'Rol bulunamadı';
        const memberCount = role?.members.size || 0;

        return interaction.editReply({
            flags: (1 << 15),
            components: [{
                type: 17,
                accent_color: 0x5865F2,
                components: [
                    { type: 10, content: `# ${team.name} — Ekip Bilgileri` },
                    { type: 14 },
                    { type: 10, content: `> **Ekip ID:** ${team.id}\n> **Rol:** <@&${team.roleId}>\n> **Boss:** ${team.leaderId ? `<@${team.leaderId}>` : 'Atanmadı'}\n> **Puan:** ${team.points}\n> **Üye:** ${memberCount} / ${team.memberLimit}` },
                    { type: 14 },
                    { type: 10, content: `### Üyeler\n${memberList}` }
                ]
            }]
        });
    }
};
