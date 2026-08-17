const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'rejectStaffModal' },
    async execute(interaction) {
        const parts = interaction.customId.split('_');
        const targetId = parts[1];
        const logMessageId = parts[2];

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        let reason = interaction.fields.getTextInputValue('reason')?.trim();
        if (!reason) reason = 'Sebep belirtilmedi.';

        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        const targetAvatar = targetMember?.user?.displayAvatarURL({ dynamic: true }) || interaction.guild.iconURL({ dynamic: true });

        // Orijinal başvuru mesajını güncelle
        try {
            const logMessage = await interaction.channel.messages.fetch(logMessageId).catch(() => null);
            if (logMessage) {
                await logMessage.edit({
                    flags: (1 << 15),
                    components: [
                        {
                            type: 17,
                            accent_color: 0xf04747,
                            components: [
                                {
                                    type: 9,
                                    components: [
                                        {
                                            type: 10,
                                            content: `# Başvuru Reddedildi\n<@${targetId}> kullanıcısının yetkili başvurusu reddedildi.`
                                        }
                                    ],
                                    accessory: {
                                        type: 11,
                                        media: { url: targetAvatar }
                                    }
                                },
                                { type: 14 },
                                {
                                    type: 10,
                                    content: `### Detaylar\n> **Kullanıcı:** <@${targetId}>\n> **Yetkili:** <@${interaction.user.id}>\n> **Sebep:** ${reason}`
                                },
                                { type: 14 },
                                {
                                    type: 10,
                                    content: `-# Powered By akuyage`
                                }
                            ]
                        }
                    ]
                }).catch(() => {});
            }
        } catch (err) {
            console.error('[rejectStaffModal] Orijinal mesaj güncellenirken hata oluştu:', err);
        }

        // Kullanıcıya DM gönder
        if (targetMember) {
            const senderButton = new ButtonBuilder()
                .setCustomId('dm_sender_info')
                .setLabel(`${interaction.user.username} - ${interaction.user.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(senderButton);

            try {
                const invite = await interaction.channel.createInvite({ maxAge: 0, maxUses: 0 });
                const serverButton = new ButtonBuilder()
                    .setLabel(interaction.guild.name)
                    .setStyle(ButtonStyle.Link)
                    .setURL(invite.url);
                row.addComponents(serverButton);
            } catch (err) {
                // Davet oluşturulamazsa sadece bilgi butonu gönderilecek
            }

            await targetMember.send({
                content: `**Başvurunuz reddedildi.**\n\nMaalesef **${interaction.guild.name}** sunucusundaki yetkili başvurunuz reddedildi.\n\n**Sebep:** ${reason}`,
                components: [row]
            }).catch(() => {});
        }

        await interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Başvuru reddedildi. Sebep: ${reason}`) });
    }
};