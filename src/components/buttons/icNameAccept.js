const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'icNameAccept' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const parts = interaction.customId.split('_');
        const targetId = parts[1];
        const newName = parts.slice(2).join('_'); // İsimde _ olabilir

        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        try {
            // Nickname değiştir
            await targetMember.setNickname(newName).catch(err => {
                console.error('[IC Onay] Nickname değiştirilemedi:', err);
            });

            // Rol ver
            if (config.roles.characterApproved) {
                await targetMember.roles.add(config.roles.characterApproved).catch(err => {
                    console.error('[IC Onay] Rol verilemedi:', err);
                });
            }

            // Orijinal mesajı sil ve yetkili kanalına bilgi ver
            await interaction.message.delete().catch(() => {});
            await interaction.reply({
                flags: (1 << 6) | (1 << 15),
                components: [{ type: 17, accent_color: 0x43b581, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Başarılı\n\n---\n✅ <@${targetId}> kullanıcısının karakter ismi (\`${newName}\`) onaylandı ve rolü verildi.\n\n-# Powered By akuyage` }] }]
            });

            // Kullanıcıya DM at (Duyuru sistemindeki gibi butonlu)
            const senderButton = new ButtonBuilder()
                .setCustomId('ic_sender_info')
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

            await targetMember.send({
                content: `Merhaba, **${interaction.guild.name}** sunucumuzdaki karakter ismi talebiniz onaylandı!\n\n**Yeni İsminiz:** ${newName}`,
                components: [row]
            }).catch(() => {});

        } catch (error) {
            console.error('[IC Onay] Hata:', error);
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'İşlem sırasında bir hata oluştu.'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
