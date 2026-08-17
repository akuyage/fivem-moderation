const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'applyStaff' },
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('staffApplication')
            .setTitle('Yetkili Başvuru Formu');

        // Soru 1: İsim ve Yaş
        const nameAgeInput = new TextInputBuilder()
            .setCustomId('nameAge')
            .setLabel('İsminiz ve Yaşınız?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Ahmet, 20')
            .setRequired(true);

        // Soru 2: Aktiflik
        const activeTimeInput = new TextInputBuilder()
            .setCustomId('activeTime')
            .setLabel('Günlük ortalama aktiflik süreniz?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 4-5 saat')
            .setRequired(true);

        // Soru 3: Neden biz?
        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Neden yetkili olmak istiyorsunuz?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Kendinizi kısaca tanıtın ve hedeflerinizi yazın.')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameAgeInput),
            new ActionRowBuilder().addComponents(activeTimeInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal);
    }
};
