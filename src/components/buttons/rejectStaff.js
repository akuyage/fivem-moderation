const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'rejectStaff' },
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.roles.cache.has(config.roles.staff)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu işlem için Admin veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        const userId = interaction.customId.split('_')[1];
        const modal = new ModalBuilder()
            .setCustomId(`rejectStaffModal_${userId}_${interaction.message.id}`)
            .setTitle('Başvuruyu Reddet');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reddetme sebebi (opsiyonel)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Sebep belirtmek isterseniz buraya yazın...')
            .setRequired(false);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
};
