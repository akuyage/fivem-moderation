const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

// Sunucu bazlı bekleme süresi (cooldown) takibi için
const cooldowns = new Map();

module.exports = {
    data: { name: 'yetkilisescagir' },
    async execute(interaction) {
        // Sadece yöneticiler bu butonu tetikleyebilsin (Güvenlik)
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu butonu sadece yöneticiler kullanabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        // Cooldown kontrolü (60 saniye)
        const now = Date.now();
        const cooldownAmount = 60 * 1000;
        const guildId = interaction.guildId;

        if (cooldowns.has(guildId)) {
            const expirationTime = cooldowns.get(guildId) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                return interaction.editReply(embeds.info(interaction.guild?.name || 'FiveM Moderation', `⚠️ Bu butonu çok sık kullanıyorsunuz! Lütfen **${timeLeft}** saniye sonra tekrar deneyin.`));
            }
        }

        // Cooldown süresini güncelle
        cooldowns.set(guildId, now);

        const staffRoleId = config.roles.staff;
        if (!staffRoleId) {
            return interaction.editReply(embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Config dosyasında staff rolü ayarlanmamış.'));
        }

        const staffRole = interaction.guild.roles.cache.get(staffRoleId);
        if (!staffRole) {
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Belirtilen yetkili rolü sunucuda bulunamadı.'));
        }

        // Avoid fetching the entire guild (can trigger opcode 8 rate limits).
        // Prefer cached members for the staff role.
        let staffMembers = staffRole.members;
        if (!staffMembers || staffMembers.size === 0) {
            // Fallback: build from guild cache without requesting the API
            staffMembers = interaction.guild.members.cache.filter(m => m.roles.cache.has(staffRoleId));
        }

        // As a last resort, attempt a guarded fetch if no cached members found
        if (!staffMembers || staffMembers.size === 0) {
            try {
                // Try a non-force fetch (may still be rate-limited on very large guilds)
                await interaction.guild.members.fetch({ force: false, withPresences: false });
                staffMembers = staffRole.members;
            } catch (e) {
                console.error('[yetkilisescagir] members.fetch failed or was rate-limited', e);
                // proceed with empty collection to avoid crashing
                staffMembers = staffMembers || new Map();
            }
        }
        
        let sentCount = 0;
        let errorCount = 0;
        const notInVoice = [];

        // Seste olmayanları belirle
        for (const [memberId, member] of staffMembers) {
            if (member.user.bot) continue;
            
            if (!member.voice.channelId) {
                notInVoice.push(member);
            }
        }

        if (notInVoice.length === 0) {
            return interaction.editReply(embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Şu anda tüm yetkililer ses kanallarında aktif durumda! 🚀'));
        }

        // DM Butonları
        const senderButton = new ButtonBuilder()
            .setCustomId('dm_sender_info')
            .setLabel(`${interaction.user.username} - ${interaction.user.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(senderButton);

        // Sunucu Daveti
        try {
            const invite = await interaction.channel.createInvite({ maxAge: 0, maxUses: 0 });
            const serverButton = new ButtonBuilder()
                .setLabel(interaction.guild.name)
                .setStyle(ButtonStyle.Link)
                .setURL(invite.url);
            row.addComponents(serverButton);
        } catch (err) {
            // Davet oluşturulamazsa es geç
        }

        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();

        const failedUsers = [];

        // DM gönder
        for (const member of notInVoice) {
            try {
                await member.send({
                    flags: (1 << 15),
                    components: [
                        {
                            type: 17, // Container
                            accent_color: 0x5865F2,
                            components: [
                                {
                                    type: 9, // Section
                                    components: [
                                        {
                                            type: 10,
                                            content: `### Yetkili Aktiflik Bildirimi\n*Merhaba **${member.user.username}**,* \n\nŞu an ses kanallarında aktif olmadığın tespit edildi. **${interaction.guild.name}** yönetim ekibinden **<@${interaction.user.id}>**, sunucumuzun düzeni ve aktifliği adına seninle iletişime geçti. \n\n__Lütfen en kısa sürede uygun bir ses kanalına giriş yaparak aktifliğini sağla.__ \n\n-# Bu otomatik bir sistem mesajıdır ve seste olmayan tüm yetkililere iletilmiştir.`
                                        }
                                    ],
                                    accessory: {
                                        type: 11,
                                        media: { url: guildIcon }
                                    }
                                },
                                { type: 14 }, // Separator
                                {
                                    type: 1, // ActionRow
                                    components: [senderButton, ...(row.components.length > 1 ? [row.components[1]] : [])]
                                }
                            ]
                        }
                    ]
                });
                sentCount++;
            } catch (err) {
                errorCount++;
                failedUsers.push(member);
            }
        }

        const failedText = failedUsers.length > 0 ? `\n> **Ulaşılamayan Üyeler:** ${failedUsers.map(u => `<@${u.id}> (\`${u.id}\`)`).join(', ')}` : '';

        const reportEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ 
                name: interaction.user.username, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`**Yetkili Aktiflik Bildirimi**\n\n> Ses çağrısı başarıyla iletildi.\n• Başarılı: **${sentCount}**\n• Başarısız (DM Kapalı): **${errorCount}**${failedText}`)
            .setFooter({ 
                text: `${interaction.client.user.username} | Yetkili Bildirim Sistemi`, 
                iconURL: interaction.client.user.displayAvatarURL() 
            });

        return interaction.editReply({ 
            content: '',
            embeds: [reportEmbed],
            components: []
        });
    }
};
