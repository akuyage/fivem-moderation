const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');
const db = require('../../database/connect');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState, client) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        // (debug logging removed)

        // ============================================================
        // 1) Kullanıcı mülakat bekleme kanalına GİRDİĞİNDE
        // ============================================================
        if (newState.channelId === config.channels.interviewWaiting) {
            try {
                const guild = newState.guild;

                // Zaten açık bir mülakat kanalı var mı kontrol et
                const existing = db.prepare('SELECT * FROM Whitelist WHERE userId = ? AND status = ?').get(member.id, 'pending');
                if (existing) {
                    const existingChannel = guild.channels.cache.get(existing.interviewChannelId);
                    if (existingChannel) {
                        await member.voice.setChannel(existingChannel).catch(() => {});
                        return;
                    } else {
                        // Kanal artık yoksa eski kaydı temizle
                        db.prepare('DELETE FROM Whitelist WHERE userId = ? AND status = ?').run(member.id, 'pending');
                    }
                }

                // Yeni ses kanalı oluştur
                const interviewChannel = await guild.channels.create({
                    name: `${member.user.username} - mülakat`,
                    type: ChannelType.GuildVoice,
                    parent: config.channels.interviewCategory || null,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak]
                        },
                        {
                            id: config.roles.staff,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak, PermissionFlagsBits.MoveMembers]
                        }
                    ]
                });

                // Kullanıcıyı yeni kanala taşı
                await member.voice.setChannel(interviewChannel).catch(() => {});

                // SİSTEM kanalına Components V2 mesaj gönder (Butonlu)
                const systemChannel = await guild.channels.fetch(config.channels.interviewSystem).catch(() => null);
                const logChannel = await guild.channels.fetch(config.channels.interviewLog).catch(() => null);
                
                if (!systemChannel) return console.error('[Mülakat] Sistem kanalı bulunamadı!');

                const avatar = member.user.displayAvatarURL({ dynamic: true });

                const systemMessage = await systemChannel.send({
                    flags: (1 << 15),
                    components: [
                        {
                            type: 17, // Container
                            accent_color: 0x3498db,
                            components: [
                                {
                                    type: 9, // Section
                                    components: [
                                        {
                                            type: 10, // TextDisplay
                                            content: `# Mülakat Bekleniyor\n<@${member.id}> kullanıcısı mülakat için bekliyor.`
                                        }
                                    ],
                                    accessory: {
                                        type: 11, // Thumbnail
                                        media: { url: avatar }
                                    }
                                },
                                { type: 14 }, // Separator
                                {
                                    type: 10,
                                    content: `### Detaylar\n> **Kullanıcı:** <@${member.id}>\n> **ID:** \`${member.id}\`\n> **Kanal:** <#${interviewChannel.id}>\n> **Durum:** Beklemede\n> **Yetkili:** Henüz atanmadı`
                                },
                                { type: 14 },
                                {
                                    type: 1, // ActionRow
                                    components: [
                                        {
                                            type: 2, // Button
                                            custom_id: `interviewClaim_${member.id}`,
                                            label: 'Mülakatı Al',
                                            style: 1 // Primary
                                        },
                                        {
                                            type: 2,
                                            custom_id: `interviewUnclaim_${member.id}`,
                                            label: 'Mülakatı Bırak',
                                            style: 2 // Secondary
                                        },
                                        {
                                            type: 2,
                                            custom_id: `interviewApprove_${member.id}`,
                                            label: 'Mülakatı Onayla',
                                            style: 3 // Success
                                        },
                                        {
                                            type: 2,
                                            custom_id: `interviewReject_${member.id}`,
                                            label: 'Mülakatı Reddet',
                                            style: 4 // Danger
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });

                // LOG kanalına düz bilgi gönder (Butonsuz)
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
                                        content: `# Mülakat Talebi\n<@${member.id}> (\`${member.user.tag}\`) kullanıcı mülakat sırasına girdi.`
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

                // Veritabanına kaydet (LogMessageId olarak sistem mesajı ID'sini tutuyoruz çünkü butonlar orada)
                db.prepare(`
                    INSERT INTO Whitelist (userId, status, interviewChannelId, logMessageId, timestamp)
                    VALUES (?, 'pending', ?, ?, ?)
                `).run(member.id, interviewChannel.id, systemMessage.id, Date.now());

            } catch (error) {
                console.error('[Mülakat] Kanal oluşturma hatası:', error);
            }
        }

        // ============================================================
        // 2) Mülakat ses kanalı BOŞALDIĞINDA otomatik sil
        // ============================================================
        if (oldState.channelId && oldState.channelId !== config.channels.interviewWaiting) {
            const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
            if (!oldChannel || oldChannel.type !== ChannelType.GuildVoice) return;

            // Bu kanal bir mülakat kanalı mı?
            const interview = db.prepare('SELECT * FROM Whitelist WHERE interviewChannelId = ? AND status = ?').get(oldState.channelId, 'pending');
            if (!interview) return;

            // Kanalda kimse kalmadıysa
            if (oldChannel.members.size === 0) {
                try {
                    // Sistem mesajını güncelle
                    const systemChannel = await oldState.guild.channels.fetch(config.channels.interviewSystem).catch(() => null);
                    if (systemChannel) {
                        const systemMessage = await systemChannel.messages.fetch(interview.logMessageId).catch(() => null);
                        if (systemMessage) {
                            await systemMessage.edit({
                                flags: (1 << 15),
                                components: [
                                    {
                                        type: 17,
                                        accent_color: 0x95a5a6,
                                        components: [
                                            {
                                                type: 9,
                                                components: [
                                                    {
                                                        type: 10,
                                                        content: `# Mülakat İptal Edildi\n<@${interview.userId}> kullanıcısının mülakatı iptal edildi.`
                                                    }
                                                ],
                                                accessory: {
                                                    type: 11,
                                                    media: { url: oldState.guild.iconURL({ dynamic: true }) || '' }
                                                }
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
                            // Silinsin, artık işlem tamamlandı
                            try {
                                await systemMessage.delete().catch(() => {});
                            } catch (e) {}
                        }
                    }

                    // Log kanalına bilgi gönder
                    const logChannel = await oldState.guild.channels.fetch(config.channels.interviewLog).catch(() => null);
                    if (logChannel) {
                        await logChannel.send({
                            flags: (1 << 15),
                            components: [
                                {
                                    type: 17,
                                    accent_color: 0x95a5a6,
                                    components: [
                                        {
                                            type: 10,
                                            content: `# Mülakat İptal\n<@${interview.userId}> kullanıcısının mülakatı kanal boşaldığı için iptal edildi.`
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

                    // Kanalı sil
                    await oldChannel.delete().catch(() => {});

                    // Veritabanından sil
                    db.prepare('DELETE FROM Whitelist WHERE interviewChannelId = ? AND status = ?').run(oldState.channelId, 'pending');

                } catch (error) {
                    console.error('[Mülakat] Boş kanal silme hatası:', error);
                }
            }
        }
    }
};
