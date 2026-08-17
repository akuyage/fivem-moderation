const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'interviewUnclaim' },
    async execute(interaction) {
        // Yetki kontrolü
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu islemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const targetId = interaction.customId.split('_')[1];

        // Veritabanından mülakat kaydını al
        const interview = db.prepare('SELECT * FROM Whitelist WHERE userId = ? AND status = ? ORDER BY timestamp DESC').get(targetId, 'pending');
        if (!interview) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu mülakat kaydı bulunamadı veya zaten sonuçlanmış.'), flags: (1 << 6) | (1 << 15) });
        }

        // Alınmamış bir mülakatı bırakamazsın
        if (!interview.moderatorId) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu mülakat henüz kimse tarafından alınmamış.'), flags: (1 << 6) | (1 << 15) });
        }

        // Sadece mülakatı alan yetkili veya admin bırakabilir
        if (interview.moderatorId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Bu mülakatı sadece <@${interview.moderatorId}> veya bir yönetici bırakabilir.`), flags: (1 << 6) | (1 << 15) });
        }

        // Veritabanını güncelle
        db.prepare('UPDATE Whitelist SET moderatorId = NULL WHERE userId = ? AND status = ?').run(targetId, 'pending');

        // Uzun işlem başlıyor: önce deferUpdate yap
        await interaction.deferUpdate();

        // Log mesajını güncelle — Components V2
        const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
        const avatar = targetUser?.displayAvatarURL({ dynamic: true }) || interaction.guild.iconURL({ dynamic: true });

        await interaction.editReply({
            flags: (1 << 15),
            components: [
                {
                    type: 17,
                    accent_color: 0x3498db,
                    components: [
                        {
                            type: 9,
                            components: [
                                {
                                    type: 10,
                                    content: `# Mülakat Bekleniyor\n<@${targetId}> kullanıcısı mülakat için bekliyor.`
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
                            content: `### Detaylar\n> **Kullanıcı:** <@${targetId}>\n> **ID:** \`${targetId}\`\n> **Kanal:** <#${interview.interviewChannelId}>\n> **Durum:** Beklemede\n> **Yetkili:** Henüz atanmadı`
                        },
                        { type: 14 },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    custom_id: `interviewClaim_${targetId}`,
                                    label: 'Mülakatı Al',
                                    style: 1
                                },
                                {
                                    type: 2,
                                    custom_id: `interviewUnclaim_${targetId}`,
                                    label: 'Mülakatı Bırak',
                                    style: 2
                                },
                                {
                                    type: 2,
                                    custom_id: `interviewApprove_${targetId}`,
                                    label: 'Mülakatı Onayla',
                                    style: 3
                                },
                                {
                                    type: 2,
                                    custom_id: `interviewReject_${targetId}`,
                                    label: 'Mülakatı Reddet',
                                    style: 4
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        // PURE LOG kanalına bilgi gönder
        const logChannel = await interaction.guild.channels.fetch(config.channels.interviewLog).catch(() => null);
        if (logChannel) {
            await logChannel.send({
                flags: (1 << 15),
                components: [
                    {
                        type: 17,
                        accent_color: 0x3498db,
                        components: [
                            {
                                type: 10,
                                content: `# Mülakat Bırakıldı\n**Kullanıcı:** <@${targetId}>\n**Yetkili:** <@${interaction.user.id}> mülakatı bıraktı.`
                            }
                        ]
                    }
                ]
            }).catch(() => {});
        }
    }
};
