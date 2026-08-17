const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { resolveToHex } = require('../../utils/steamResolver');

module.exports = {
    data: { name: 'interviewApproveModal' },
    async execute(interaction) {
        const parts = interaction.customId.split('_');
        const targetId = parts[1];
        const logMessageId = parts[2];

        const steamUrl = interaction.fields.getTextInputValue('steamUrl');

        // Veritabanından mülakat kaydını al
        const interview = db.prepare('SELECT * FROM Whitelist WHERE userId = ? AND status = ? ORDER BY timestamp DESC').get(targetId, 'pending');
        if (!interview) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu mülakat kaydı bulunamadı veya zaten sonuçlanmış.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        try {
            // Steam HEX ID çözümle
            const { hex, steamId64 } = await resolveToHex(steamUrl);

            // Veritabanını güncelle
            db.prepare(`
                UPDATE Whitelist 
                SET status = 'approved', steamHex = ?, steamProfileUrl = ?, moderatorId = ?
                WHERE userId = ? AND status = 'pending'
            `).run(hex, steamUrl, interaction.user.id, targetId);

            // Kullanıcıya whitelist rolü ver ve non-whitelist rolünü al
            const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (targetMember) {
                if (config.roles.whitelist) {
                    await targetMember.roles.add(config.roles.whitelist).catch(err => {
                        console.error('[Mülakat] Whitelist rolü verilemedi:', err);
                    });
                }
                
                if (config.roles.unregistered) {
                    await targetMember.roles.remove(config.roles.unregistered).catch(err => {
                        console.error('[Mülakat] Unregistered rolü alınamadı:', err);
                    });
                }
            }

            // Yetkili İstatistiğini Güncelle
            db.prepare('INSERT OR IGNORE INTO StaffStats (userId) VALUES (?)').run(interaction.user.id);
            db.prepare('UPDATE StaffStats SET interviewsHandled = interviewsHandled + 1 WHERE userId = ?').run(interaction.user.id);

            // Log mesajını güncelle (SİSTEM kanalındaki butonlu mesaj)
            const systemChannel = await interaction.guild.channels.fetch(config.channels.interviewSystem).catch(() => null);
            if (systemChannel) {
                const systemMessage = await systemChannel.messages.fetch(logMessageId).catch(() => null);
                if (systemMessage) {
                    const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
                    const avatar = targetUser?.displayAvatarURL({ dynamic: true }) || interaction.guild.iconURL({ dynamic: true });

                    await systemMessage.edit({
                        flags: (1 << 15),
                        components: [
                            {
                                type: 17, // Container
                                accent_color: 0x2ecc71,
                                components: [
                                    {
                                        type: 9, // Section
                                        components: [
                                            {
                                                type: 10,
                                                content: `# Mülakat Tamamlandı\n<@${targetId}> kullanıcısının mülakatı başarıyla tamamlandı.`
                                            }
                                        ],
                                        accessory: {
                                            type: 11,
                                            media: { url: avatar }
                                        }
                                    },
                                    { type: 14 },
                                    {
                                        type: 10,
                                        content: `### Detaylar\n> **Kullanıcı:** <@${targetId}>\n> **Yetkili:** <@${interaction.user.id}>\n> **Steam HEX:** \`${hex}\`\n> **Steam Profil:** ${steamUrl}\n> **Durum:** Onaylandı`
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
                    // Mesaj işlem sonrası silinsin
                    try {
                        await systemMessage.delete().catch(() => {});
                    } catch (e) {}

                    // Veritabanındaki logMessageId'yi temizle
                    try {
                        db.prepare('UPDATE Whitelist SET logMessageId = ? WHERE userId = ? AND status = ?').run('', targetId, 'approved');
                    } catch (e) {}
                }
            }

            // PURE LOG kanalına bilgi gönder
            const logChannel = await interaction.guild.channels.fetch(config.channels.interviewLog).catch(() => null);
            if (logChannel) {
                await logChannel.send({
                    flags: (1 << 15),
                    components: [
                        {
                            type: 17,
                            accent_color: 0x2ecc71,
                            components: [
                                {
                                    type: 10,
                                    content: `# Mülakat Onaylandı\n**Kullanıcı:** <@${targetId}>\n**Yetkili:** <@${interaction.user.id}>\n**Steam HEX:** \`${hex}\``
                                }
                            ]
                        }
                    ]
                }).catch(() => {});
            }

            // Mülakat ses kanalını sil
            const interviewChannel = await interaction.guild.channels.fetch(interview.interviewChannelId).catch(() => null);
            if (interviewChannel) {
                await interviewChannel.delete().catch(() => {});
            }

            // Kullanıcıya DM gönder (dmduyuru formatında)
            if (targetMember) {
                const senderButton = new ButtonBuilder()
                    .setCustomId('interview_approve_info')
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
                    content: `Tebrikler! **${interaction.guild.name}** sunucusundaki mülakatınız başarıyla tamamlandı!\n\n**Steam HEX ID:** \`${hex}\`\nWhitelist rolünüz verildi. Sunucuya hoş geldiniz!`,
                    components: [row]
                }).catch(() => {});
            }

            await interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Mülakat onaylandı! HEX: \`${hex}\``) });

        } catch (error) {
            console.error('[Mülakat Onay] Steam çözümleme hatası:', error);
            await interaction.editReply(embeds.info(interaction.guild?.name || 'FiveM Moderation', `Steam profil linki çözümlenemedi: ${error.message}\n\nLütfen geçerli bir Steam profil linki girin.`));
        }
    }
};
