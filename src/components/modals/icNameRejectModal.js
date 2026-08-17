const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'icNameRejectModal' },
    async execute(interaction) {
        const parts = interaction.customId.split('_');
        const targetId = parts[1];
        const messageId = parts[2];
        const reason = interaction.fields.getTextInputValue('reason');

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        
        // Orijinal mesajı güncelle
        const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
        if (message) {
            await message.edit({
                content: `❌ <@${targetId}> kullanıcısının karakter ismi reddedildi.\n**Sebep:** ${reason}`,
                embeds: [],
                components: []
            }).catch(() => {});

            // 5 saniye sonra mesajı sil
            setTimeout(() => {
                message.delete().catch(() => {});
            }, 5000);
        }

        // Kullanıcıya DM at (Duyuru sistemindeki gibi butonlu)
        if (targetMember) {
            const senderButton = new ButtonBuilder()
                .setCustomId('ic_reject_info')
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
            } catch (err) {}

            targetMember.send({
                content: `Merhaba, **${interaction.guild.name}** sunucumuzdaki karakter ismi talebiniz reddedildi.\n\n**Sebep:** ${reason}`,
                components: [row]
            }).catch(() => {});
        }

        await interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Talep reddedildi ve kullanıcıya (varsa) DM gönderildi.') });
    }
};
