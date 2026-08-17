const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamChangeOG' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        // Sadece boss veya admin değiştirebilir
        if (interaction.user.id !== team.leaderId && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'OG değişikliği yapmak için yetkiniz yok.'), flags: (1 << 6) | (1 << 15) });
        }

        return interaction.reply({
            flags: (1 << 6) | (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865F2,
                    components: [
                        {
                            type: 10,
                            content: `# OG Değiştirme Paneli\nLütfen **${team.name}** ekibinin yeni OG'sini seçin.`
                        },
                        { type: 14 },
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 5, // UserSelect
                                    custom_id: `teamConfirmOG_${teamId}`,
                                    placeholder: 'Yeni OG seç...',
                                    min_values: 1,
                                    max_values: 1
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    }
};
