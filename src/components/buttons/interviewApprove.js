const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'interviewApprove' },
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

        // Mülakatı almadan onaylama yapılamaz
        if (!interview.moderatorId) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Mülakatı onaylamak için önce "Mülakatı Al" butonuna basmalısınız.'), flags: (1 << 6) | (1 << 15) });
        }

        // Sadece mülakatı alan yetkili veya admin onaylayabilir
        if (interview.moderatorId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `❌ Bu mülakatı sadece <@${interview.moderatorId}> veya bir yönetici onaylayabilir.`), flags: (1 << 6) | (1 << 15) });
        }

        // Modal aç — Steam profil linki iste
        const modal = new ModalBuilder()
            .setCustomId(`interviewApproveModal_${targetId}_${interview.logMessageId}`)
            .setTitle('Mülakat Onaylama');

        const steamInput = new TextInputBuilder()
            .setCustomId('steamUrl')
            .setLabel('Steam Profil Linki')
            .setPlaceholder('https://steamcommunity.com/profiles/76561198... veya /id/...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(steamInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
};
