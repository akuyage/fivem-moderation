const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'interviewClaim' },
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

        // Zaten alınmış mı?
        if (interview.moderatorId) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Bu mülakat zaten <@${interview.moderatorId}> tarafından alınmış!`), flags: (1 << 6) | (1 << 15) });
        }

        // Yetkili, kullanıcının sesli kanalında mı?
        const interviewChannel = await interaction.guild.channels.fetch(interview.interviewChannelId).catch(() => null);
        if (!interviewChannel) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Mülakat ses kanalı bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        const staffVoice = interaction.member.voice?.channel;
        if (!staffVoice || staffVoice.id !== interviewChannel.id) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Mülakatı alabilmek için önce <#${interviewChannel.id}> kanalına girmelisiniz!`), flags: (1 << 6) | (1 << 15) });
        }

        // Veritabanını güncelle
        db.prepare('UPDATE Whitelist SET moderatorId = ? WHERE userId = ? AND status = ?').run(interaction.user.id, targetId, 'pending');

        // Uzun işlem başlıyor: önce deferUpdate yap
        await interaction.deferUpdate();

        // Log mesajını güncelle — Components V2
        const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
        const avatar = targetUser?.displayAvatarURL({ dynamic: true }) || interaction.guild.iconURL({ dynamic: true });

        await interaction.editReply({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0xe67e22,
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // TextDisplay
                                    content: `# Mülakatla İlgileniliyor\n<@${targetId}> kullanıcısının mülakatı ile ilgileniliyor.`
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
                            content: `### Detaylar\n> **Kullanıcı:** <@${targetId}>\n> **ID:** \`${targetId}\`\n> **Kanal:** <#${interview.interviewChannelId}>\n> **Durum:** İlgileniliyor\n> **Yetkili:** <@${interaction.user.id}>`
                        },
                        { type: 14 },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    custom_id: `interviewClaim_${targetId}`,
                                    label: 'Mülakatı Al',
                                    style: 1,
                                    disabled: true
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
                        accent_color: 0xe67e22,
                        components: [
                            {
                                type: 10,
                                content: `# Mülakat Alındı\n**Kullanıcı:** <@${targetId}>\n**Yetkili:** <@${interaction.user.id}>\n**Kanal:** <#${interview.interviewChannelId}>`
                            }
                        ]
                    }
                ]
            }).catch(() => {});
        }
    }
};
