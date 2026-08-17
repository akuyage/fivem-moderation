const { ChannelType, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'ticketCreate' },
    async execute(interaction) {
        const categoryValue = interaction.customId.split('_')[1];
        const categoryMap = {
            'ingame': 'Oyun İçi Destek',
            'outgame': 'Oyun Dışı Destek',
            'anticheat': 'Anticheat Destek'
        };

        const categoryName = categoryMap[categoryValue] || 'Ticket';

        // --- Tüm senkron kontroller deferReply'dan ÖNCE yapılır ---

        // Daha önce açık bileti var mı kontrol et
        const existingTicket = db.prepare('SELECT * FROM Tickets WHERE userId = ? AND status = ?').get(interaction.user.id, 'open');
        if (existingTicket) {
            const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
            if (!existingChannel) {
                db.prepare('UPDATE Tickets SET status = ? WHERE channelId = ?').run('closed', existingTicket.channelId);
            } else {
                return interaction.reply({
                    flags: (1 << 6) | (1 << 15),
                    components: [{ type: 17, accent_color: 0x2f3136, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Bilgi\n\n---\nZaten açık bir Ticket'ınız bulunuyor: <#${existingTicket.channelId}>\n\n-# Powered By akuyage` }] }]
                });
            }
        }

        let ticketCategory = null;
        if (config.channels.ticketCategory) {
            ticketCategory = interaction.guild.channels.cache.get(config.channels.ticketCategory);
            if (!ticketCategory) {
                return interaction.reply({
                    flags: (1 << 6) | (1 << 15),
                    components: [{ type: 17, accent_color: 0xf04747, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Hata\n\n---\n❌ Sistem Hatası: Ayarlanan Ticket kategorisi sunucuda bulunamadı.\n\n-# Powered By akuyage` }] }]
                });
            }
            if (ticketCategory.type !== ChannelType.GuildCategory) {
                return interaction.reply({
                    flags: (1 << 6) | (1 << 15),
                    components: [{ type: 17, accent_color: 0xf04747, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Hata\n\n---\n❌ Sistem Hatası: config.json içindeki ticketCategory bir kategori değil. Lütfen bir 'Kategori' ID'si girin.\n\n-# Powered By akuyage` }] }]
                });
            }
        }

        // Tüm kontroller geçildikten sonra deferReply yap
        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        try {
            // Toplam bilet sayısını al ve artır
            let guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(interaction.guild.id);
            if (!guildConfig) {
                db.prepare('INSERT INTO GuildConfig (guildId, totalTickets) VALUES (?, ?)').run(interaction.guild.id, 1);
                guildConfig = { totalTickets: 1 };
            } else {
                db.prepare('UPDATE GuildConfig SET totalTickets = totalTickets + 1 WHERE guildId = ?').run(interaction.guild.id);
                guildConfig.totalTickets += 1;
            }

            const ticketId = guildConfig.totalTickets;

            // Kanalı oluştur
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: ticketCategory ? ticketCategory.id : null,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id, // Bileti açan kişi
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: config.roles.staff, // Yetkililer
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            // Garanti olması açısından kanalı kategoriye taşı (Discord API bazen create sırasında parent'i yok sayabiliyor)
            if (ticketCategory) {
                await ticketChannel.setParent(ticketCategory.id, { lockPermissions: false }).catch(() => {});
            }

            // Veritabanına kaydet
            db.prepare(`
                INSERT INTO Tickets (channelId, userId, status, category, createdAt)
                VALUES (?, ?, ?, ?, ?)
            `).run(ticketChannel.id, interaction.user.id, 'open', categoryName, Date.now());

            const containerComponents = [];

            if (config.ticketBanner) {
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: config.ticketBanner } }]
                });
                containerComponents.push({ type: 14 });
            }

            const textContent = `# ${interaction.guild.name} Destek Merkezi\nHoş Geldin, <@${interaction.user.id}>!\nTalebiniz başarıyla oluşturulmuştur. <@&${config.roles.staff}> en kısa sürede sizinle iletişime geçecektir.\n\n> **Ortalama Yanıt Süresi:** \`20 sn\`\n> Lütfen bu süreçte sorununuzu detaylıca açıklayarak varsa **kanıtları (fotoğraf/video)** iletmeyi unutmayın.\n\n---\n**Talep Detayları**\n- **Kategori:** \`${categoryName}\`\n- **Ticket Numarası:** \`#${ticketId}\`\n- **Kullanıcı Bilgisi:** \`${interaction.user.username}\``;

            containerComponents.push({
                type: 10,
                content: textContent
            });

            containerComponents.push({ type: 14 });

            containerComponents.push({
                type: 1, // ActionRow 1
                components: [
                    { type: 2, custom_id: 'ticketClaim', label: 'Ticketi Üstlen', style: 3 },
                    { type: 2, custom_id: 'ticketUnclaim', label: 'Ticketi Bırak', style: 4 },
                    { type: 2, custom_id: 'ticketClose_staff', label: 'Kapat', style: 2 }
                ]
            });

            containerComponents.push({
                type: 1, // ActionRow 2
                components: [
                    { type: 2, custom_id: 'ticketPingUser', label: 'Kullanıcıyı Çağır', style: 1 },
                    { type: 2, custom_id: 'ticketAddUser', label: 'Kullanıcı Ekle', style: 2 },
                    { type: 2, custom_id: 'ticketRemoveUser', label: 'Kullanıcı Çıkar', style: 4 }
                ]
            });

            await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${config.roles.staff}>` });

            const controlMsg = await ticketChannel.send({
                flags: (1 << 15),
                components: [
                    {
                        type: 17,
                        accent_color: 0x2f3136,
                        components: containerComponents
                    }
                ]
            });

            await controlMsg.pin().catch(() => {});

            return interaction.editReply({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0x43b581, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Başarılı\n\n---\n✅ Ticket'ınız başarıyla oluşturuldu: ${ticketChannel}\n\n-# Powered By akuyage` }] }]
            });

        } catch (error) {
            console.error('[Ticket] Kanal oluşturulurken hata:', error);
            return interaction.editReply({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0xf04747, components: [{ type: 10, content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Hata\n\n---\n❌ Bilet oluşturulurken bir hata oluştu.\n\n-# Powered By akuyage` }] }]
            });
        }
    }
};
