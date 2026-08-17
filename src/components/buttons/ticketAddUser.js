const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'ticketAddUser' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const modal = new ModalBuilder()
            .setCustomId('ticketAddUserModal')
            .setTitle('Ticket\'e Kullanıcı Ekle');

        const userIdInput = new TextInputBuilder()
            .setCustomId('userId')
            .setLabel('Kullanıcı ID\'si')
            .setPlaceholder('Eklemek istediğiniz kullanıcının ID\'sini girin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
        await interaction.showModal(modal);
    }
};
