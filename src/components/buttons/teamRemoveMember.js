const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'teamRemoveMember' },
    async execute(interaction) {
        const teamId = interaction.customId.split('_')[1];
        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(parseInt(teamId));

        if (!team) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu ekip artık mevcut değil.'), flags: (1 << 6) | (1 << 15) });
        }

        // Sadece boss veya admin çıkartabilir
        if (interaction.user.id !== team.leaderId && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Üye çıkartmak için yetkiniz yok.'), flags: (1 << 6) | (1 << 15) });
        }

        return interaction.reply({
            flags: (1 << 6) | (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0xf04747,
                    components: [
                        {
                            type: 10,
                            content: `# Üye Çıkartma Paneli\nLütfen **${team.name}** ekibinden çıkartmak istediğiniz üyeyi seçin.`
                        },
                        { type: 14 },
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 5, // UserSelect
                                    custom_id: `teamConfirmRemove_${teamId}`,
                                    placeholder: 'Üye seç...',
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
