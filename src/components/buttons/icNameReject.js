const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'icNameReject' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const targetId = interaction.customId.split('_')[1];

        const modal = new ModalBuilder()
            .setCustomId(`icNameRejectModal_${targetId}_${interaction.message.id}`)
            .setTitle('Karakter İsmi Reddet');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reddetme Sebebi')
            .setPlaceholder('Lütfen reddetme sebebini buraya yazın...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        await interaction.showModal(modal);
    }
};
