const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kur')
        .setDescription('Botun çalışması için gerekli tüm kanal ve kategorileri otomatik oluşturur.')
        .addChannelOption(opt =>
            opt.setName('mulakat-bekleme')
                .setDescription('Mevcut Mülakat Bekleme ses kanalını seçin')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('ic-isim')
                .setDescription('Mevcut IC İsim kanalını seçin')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('ekip-davet')
                .setDescription('Mevcut Ekip Davet kanalını seçin')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('bot-ses-kanali')
                .setDescription('Botun sürekli duracağı ses kanalını seçin')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('ceza-bilgilendirme')
                .setDescription('Mevcut Ceza Bilgilendirme kanalını seçin')
                .setRequired(true)
        )
        .addRoleOption(opt =>
            opt.setName('staff-rol')
                .setDescription('Yetkili (Staff) rolünü seçin — log kanallarına erişim ve tüm sistem bu role göre ayarlanır')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('server-ip')
                .setDescription('Sunucu IP adresi (Örn: 192.168.1.1)')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('server-ts')
                .setDescription('TeamSpeak adresi (Örn: ts.sunucu.com)')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('mulakat-kategori')
                .setDescription('Mülakat odalarının açılacağı kategori')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('ekip-kategori')
                .setDescription('Ekip kanallarının açılacağı kategori')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('ticket-kategori')
                .setDescription('Destek taleplerinin açılacağı kategori')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Developer Kontrolü
        if (!config.developers.includes(interaction.user.id)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu sadece bot geliştiricileri kullanabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply();

        const mulakatBekleme = interaction.options.getChannel('mulakat-bekleme');
        const icIsim = interaction.options.getChannel('ic-isim');
        const ekipDavet = interaction.options.getChannel('ekip-davet');
        const mulakatKategori = interaction.options.getChannel('mulakat-kategori');
        const ekipKategori = interaction.options.getChannel('ekip-kategori');
        const ticketKategori = interaction.options.getChannel('ticket-kategori');
        const serverIp = interaction.options.getString('server-ip');
        const serverTs = interaction.options.getString('server-ts');
        const botVoiceChannel = interaction.options.getChannel('bot-ses-kanali');
        const cezaBilgilendirme = interaction.options.getChannel('ceza-bilgilendirme');
        const staffRole = interaction.options.getRole('staff-rol');

        const guild = interaction.guild;

        try {
            // 1. Yetkili Rolü — config'e kaydet
            config.roles.staff = staffRole.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));


            // 3. LOG KATEGORİLERİ OLUŞTURULUYOR
            const moderationLogCategory = await guild.channels.create({
                name: 'Moderation Logs',
                type: ChannelType.GuildCategory,
                reason: `Kurulum - Sorumlu: ${interaction.user.tag}`,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ]
            });

            const systemLogCategory = await guild.channels.create({
                name: 'System Logs',
                type: ChannelType.GuildCategory,
                reason: `Kurulum - Sorumlu: ${interaction.user.tag}`,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ]
            });

            const memberLogCategory = await guild.channels.create({
                name: 'Member Logs',
                type: ChannelType.GuildCategory,
                reason: `Kurulum - Sorumlu: ${interaction.user.tag}`,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ]
            });

            // Değişkenleri tanımlıyoruz
            let messageLogChannel, voiceLogChannel, roleLogChannel, channelLogChannel, nameLogChannel, securityLogChannel;
            let joinedLogChannel, leavedLogChannel;
            let commandLogChannel, warningLogChannel, punishLogChannel, kickLogChannel, banLogChannel, whitelistPunishLogChannel, modLogChannel;
            let inviteReportLogChannel, ticketLogChannel, ekipDavetLogChannel, inviteLogChannel;

            // System Logs
            messageLogChannel = await guild.channels.create({ name: 'message-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            voiceLogChannel = await guild.channels.create({ name: 'voice-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            roleLogChannel = await guild.channels.create({ name: 'role-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            channelLogChannel = await guild.channels.create({ name: 'channel-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            nameLogChannel = await guild.channels.create({ name: 'name-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            securityLogChannel = await guild.channels.create({ name: 'guvenlik-log', parent: systemLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });

            // Member Logs
            joinedLogChannel = await guild.channels.create({ name: 'joined-log', parent: memberLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            leavedLogChannel = await guild.channels.create({ name: 'leaved-log', parent: memberLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });

            // Moderation Logs
            commandLogChannel = await guild.channels.create({ name: 'komut-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            warningLogChannel = await guild.channels.create({ name: 'uyari-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            punishLogChannel = await guild.channels.create({ name: 'ceza-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            kickLogChannel = await guild.channels.create({ name: 'kick-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            banLogChannel = await guild.channels.create({ name: 'ban-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            whitelistPunishLogChannel = await guild.channels.create({ name: 'whitelist-ceza-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            inviteLogChannel = await guild.channels.create({ name: 'invite-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            inviteReportLogChannel = await guild.channels.create({ name: 'invite-report', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            ticketLogChannel = await guild.channels.create({ name: 'ticket-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });

            // Ek Moderasyon Logları & Bilgilendirme
            modLogChannel = await guild.channels.create({ name: 'yetkilibasvuru-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });
            ekipDavetLogChannel = await guild.channels.create({ name: 'ekip-davet-log', parent: moderationLogCategory.id, reason: `Kurulum - Sorumlu: ${interaction.user.tag}` });

            // 6. MÜLAKAT SİSTEM KANALLARI (Kategori kullanıcıdan veya null)
            const interviewParentId = mulakatKategori ? mulakatKategori.id : null;

            // Mülakat bekleme kanalı dışarıdan argüman olarak alındı
            const interviewSystemChannel = await guild.channels.create({
                name: 'mülakat-sistemi',
                parent: interviewParentId,
                reason: `Kurulum - Sorumlu: ${interaction.user.tag}`,
                permissionOverwrites: interviewParentId ? undefined : [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ]
            });
            const interviewLogChannel = await guild.channels.create({
                name: 'mülakat-log',
                parent: moderationLogCategory.id,
                reason: `Kurulum - Sorumlu: ${interaction.user.tag}`,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                ]
            });

            // 8. Whitelist Uyarı Rolleri Oluşturma (Uyarı Puanı - I ve II)
            const db = require('../../database/connect');
            console.log('[Kurulum] Uyarı Puanı - I ve II rolleri oluşturuluyor...');

            let role1 = guild.roles.cache.find(r => r.name === 'Uyarı Puanı - I');
            if (!role1) {
                role1 = await guild.roles.create({ name: 'Uyarı Puanı - I', color: 0xfaa61a, reason: 'Kurulum - Uyarı Puanı I' });
            }
            db.prepare('INSERT OR REPLACE INTO WLWarningRoles (level, roleId) VALUES (1, ?)').run(role1.id);

            let role2 = guild.roles.cache.find(r => r.name === 'Uyarı Puanı - II');
            if (!role2) {
                role2 = await guild.roles.create({ name: 'Uyarı Puanı - II', color: 0xf04747, reason: 'Kurulum - Uyarı Puanı II' });
            }
            db.prepare('INSERT OR REPLACE INTO WLWarningRoles (level, roleId) VALUES (2, ?)').run(role2.id);

            // GuildConfig'e de kaydet
            db.prepare('INSERT OR IGNORE INTO GuildConfig (guildId) VALUES (?)').run(guild.id);
            db.prepare('UPDATE GuildConfig SET wlAnnounceChannelId = ?, wlWarning1RoleId = ?, wlWarning2RoleId = ? WHERE guildId = ?')
                .run(cezaBilgilendirme.id, role1.id, role2.id, guild.id);

            // 9. Config Güncelleme


            // Sistem Log Kanalları
            config.channels.messageLogChannel = messageLogChannel.id;
            config.channels.voiceLogChannel = voiceLogChannel.id;
            config.channels.roleLogChannel = roleLogChannel.id;
            config.channels.channelLogChannel = channelLogChannel.id;
            config.channels.nameLogChannel = nameLogChannel.id;
            config.channels.securityLogChannel = securityLogChannel.id;

            // Üye Log Kanalları
            config.channels.joinedLogChannel = joinedLogChannel.id;
            config.channels.leavedLogChannel = leavedLogChannel.id;

            // Moderasyon Log Kanalları
            config.channels.commandLogChannel = commandLogChannel.id;
            config.channels.warningLogChannel = warningLogChannel.id;
            config.channels.punishLogChannel = punishLogChannel.id;
            config.channels.kickLogChannel = kickLogChannel.id;
            config.channels.banLogChannel = banLogChannel.id;
            config.channels.whitelistPunishLog = whitelistPunishLogChannel.id;
            config.channels.wlAnnounceChannel = cezaBilgilendirme.id;

            // Davet Log Kanalları
            config.channels.inviteLogChannel = inviteLogChannel.id;
            config.channels.inviteReportLog = inviteReportLogChannel.id;
            config.channels.yetkiliBasvuruLogChannel = modLogChannel.id;

            // Bilet Log Kanalları
            config.channels.ticketLogChannel = ticketLogChannel.id;

            // Ekip Davet Log Kanalı
            config.channels.ekipDavetLogChannel = ekipDavetLogChannel.id;

            // Mülakat Kanalları
            config.channels.interviewLog = interviewLogChannel.id;
            config.channels.interviewSystem = interviewSystemChannel.id;
            config.channels.interviewWaiting = mulakatBekleme.id;
            config.channels.interviewCategory = interviewParentId || '';

            // IC İsim Kanalı
            config.channels.icName = icIsim.id;

            // Diğer Kanallar
            config.channels.teamInviteChannel = ekipDavet.id;
            config.channels.teamCategory = ekipKategori ? ekipKategori.id : '';
            config.channels.ticketCategory = ticketKategori ? ticketKategori.id : '';
            config.channels.botVoiceChannel = botVoiceChannel.id;

            // Kategori ID'lerini de kaydet (Silme işlemi için)
            config.channels.systemLogCategory = systemLogCategory.id;
            config.channels.memberLogCategory = memberLogCategory.id;
            config.channels.moderationLogCategory = moderationLogCategory.id;

            // Sunucu IP'leri
            config.serverIp = serverIp;
            config.serverTs = serverTs;

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Kurulum biter bitmez bota yeniden başlatma gerektirmeden ses kanalına sokalım
            if (botVoiceChannel) {
                const { joinVoiceChannel } = require('@discordjs/voice');
                try {
                    joinVoiceChannel({
                        channelId: botVoiceChannel.id,
                        guildId: guild.id,
                        adapterCreator: guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: true
                    });
                } catch (err) {
                    console.error('[SES HATA] Kurulum sırasında ses kanalına bağlanılamadı:', err);
                }
            }

            // Components V2 ile sonuç paneli
            await interaction.editReply({
                flags: (1 << 15),
                components: [
                    {
                        type: 17, // Container
                        accent_color: 0x43b581,
                        components: [
                            {
                                type: 10, // TextDisplay
                                content: `# FiveM Moderation - Kurulum Tamamlandı!`
                            },
                            { type: 14 }, // Separator
                            {
                                type: 9, // Section
                                components: [
                                    {
                                        type: 10,
                                        content: `### Yetkili Rolü\n<@&${staffRole.id}>`
                                    }
                                ],
                                accessory: {
                                    type: 11,
                                    media: { url: guild.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL() }
                                }
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Sistem Logları\n> <#${messageLogChannel.id}> • <#${voiceLogChannel.id}>\n> <#${roleLogChannel.id}> • <#${channelLogChannel.id}>\n> <#${nameLogChannel.id}> • <#${securityLogChannel.id}>`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Üye Logları\n> <#${joinedLogChannel.id}> • <#${leavedLogChannel.id}>`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Moderasyon Logları\n> <#${commandLogChannel.id}> • <#${warningLogChannel.id}>\n> <#${punishLogChannel.id}> • <#${kickLogChannel.id}> • <#${banLogChannel.id}>\n> <#${whitelistPunishLogChannel.id}>\n> <#${inviteReportLogChannel.id}>\n> <#${ticketLogChannel.id}>\n> <#${modLogChannel.id}>\n> <#${interviewLogChannel.id}>`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Mülakat\n> <#${mulakatBekleme.id}> • <#${interviewSystemChannel.id}>\n> Kategori: ${mulakatKategori ? `<#${mulakatKategori.id}>` : 'Yok'}`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### IC İsim\n> <#${icIsim.id}>`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Destek Talepleri (Tickets)\n> Kategori: ${ticketKategori ? `<#${ticketKategori.id}>` : 'Yok'}`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Ekip Davet\n> <#${ekipDavet.id}> • <#${ekipDavetLogChannel.id}>\n> Kategori: ${ekipKategori ? "<#" + ekipKategori.id + ">" : "Yok"}`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `### Bot Ses Kanalı\n> <#${botVoiceChannel.id}>`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `-# Powered By akuyage`
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Kurulum sırasında bir hata oluştu. Lütfen botun "Kanalları Yönet" ve "Rolleri Yönet" yetkisi olduğundan emin olun.') });
        }
    }
};
