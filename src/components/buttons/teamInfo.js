const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamInfo' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const role = interaction.guild.roles.cache.get(team.roleId);
        const memberList = role ? role.members.map(m => `<@${m.id}>`).join(', ') || 'Üye yok' : 'Rol bulunamadı';
        const memberCount = role?.members.size || 0;

        return interaction.reply({
            flags: (1 << 6) | (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865F2,
                    components: [
                        {
                            type: 10,
                            content: `# ${team.name} — Detaylı Bilgi`
                        },
                        { type: 14 },
                        {
                            type: 10,
                            content: `> **Ekip ID:** ${team.id}\n> **Rol:** <@&${team.roleId}>\n> **Boss:** ${team.leaderId ? `<@${team.leaderId}>` : 'Atanmadı'}\n> **OG:** ${team.ogId ? `<@${team.ogId}>` : 'Atanmadı'}\n> **Puan:** ${team.points}\n> **Üye:** ${memberCount} / ${team.memberLimit}`
                        },
                        { type: 14 },
                        {
                            type: 10,
                            content: `### Üyeler\n${memberList}`
                        }
                    ]
                }
            ]
        });
    }
};
