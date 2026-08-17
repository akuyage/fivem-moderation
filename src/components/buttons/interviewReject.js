const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'interviewReject' },
    async execute(interaction) {
        // Yetki kontrolü
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const targetId = interaction.customId.split('_')[1];

        // Veritabanından mülakat kaydını al
        const interview = db.prepare('SELECT * FROM Whitelist WHERE userId = ? AND status = ? ORDER BY timestamp DESC').get(targetId, 'pending');
        if (!interview) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu mülakat kaydı bulunamadı veya zaten sonuçlanmış.'), flags: (1 << 6) | (1 << 15) });
        }

        // Mülakatı almadan reddetme yapılamaz
        if (!interview.moderatorId) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Mülakatı reddetmek için önce "Mülakatı Al" butonuna basmalısınız.'), flags: (1 << 6) | (1 << 15) });
        }

        // Sadece mülakatı alan yetkili veya admin reddedebilir
        if (interview.moderatorId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `❌ Bu mülakatı sadece <@${interview.moderatorId}> veya bir yönetici reddedebilir.`), flags: (1 << 6) | (1 << 15) });
        }

        // Modal aç — Reddetme sebebi iste
        const modal = new ModalBuilder()
            .setCustomId(`interviewRejectModal_${targetId}_${interview.logMessageId}`)
            .setTitle('Mülakat Reddetme');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reddetme Sebebi')
            .setPlaceholder('Mülakatın reddedilme sebebini giriniz...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
};
