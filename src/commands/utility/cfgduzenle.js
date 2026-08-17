const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

// Config'deki alan açıklamaları (Autocomplete için)
const ROLE_LABELS = {
    staff: 'Yetkili Rolü',
    mute: 'Susturma Rolü',
    characterApproved: 'Karakter Onay Rolü',
    whitelist: 'Whitelist Rolü',
    unregistered: 'Kayıtsız Rolü'
};

const CHANNEL_LABELS = {
    ticketCategory: 'Ticket Kategorisi',
    teamCategory: 'Ekipler Kategorisi',
    messageLogChannel: 'Mesaj Log Kanalı',
    voiceLogChannel: 'Ses Log Kanalı',
    roleLogChannel: 'Rol Log Kanalı',
    channelLogChannel: 'Kanal Log Kanalı',
    nameLogChannel: 'İsim Log Kanalı',
    securityLogChannel: 'Güvenlik Log Kanalı',
    joinedLogChannel: 'Katılım Log Kanalı',
    leavedLogChannel: 'Ayrılma Log Kanalı',
    commandLogChannel: 'Komut Log Kanalı',
    warningLogChannel: 'Uyarı Log Kanalı',
    punishLogChannel: 'Ceza Log Kanalı',
    kickLogChannel: 'Kick Log Kanalı',
    banLogChannel: 'Ban Log Kanalı',
    whitelistPunishLog: 'Whitelist Ceza Log Kanalı',
    wlAnnounceChannel: 'Ceza Bilgilendirme Kanalı',
    inviteReportLog: 'Davet Rapor Kanalı',
    ticketLogChannel: 'Ticket Log Kanalı',
    interviewLog: 'Mülakat Log Kanalı',
    interviewWaiting: 'Mülakat Bekleme Kanalı',
    interviewCategory: 'Mülakat Kategorisi',
    icName: 'IC İsim Kanalı',
    teamInviteChannel: 'Ekip Davet Kanalı',
    interviewSystem: 'Mülakat Sistem Kanalı',
    systemLogCategory: 'System Log Kategorisi',
    memberLogCategory: 'Member Log Kategorisi',
    moderationLogCategory: 'Moderation Log Kategorisi'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cfg-duzenle')
        .setDescription('Config.json içindeki rol ve kanal ayarlarını düzenler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('rol')
                .setDescription('Bir config rolünü değiştirir.')
                .addStringOption(opt =>
                    opt.setName('alan')
                        .setDescription('Hangi rol ayarını değiştirmek istiyorsunuz?')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addRoleOption(opt =>
                    opt.setName('rol')
                        .setDescription('Yeni rol')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('kanal')
                .setDescription('Bir config kanalını değiştirir.')
                .addStringOption(opt =>
                    opt.setName('alan')
                        .setDescription('Hangi kanal ayarını değiştirmek istiyorsunuz?')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(opt =>
                    opt.setName('kanal')
                        .setDescription('Yeni kanal veya kategori')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('sunucu')
                .setDescription('Sunucu IP veya TS adresini düzenler.')
                .addStringOption(opt =>
                    opt.setName('alan')
                        .setDescription('Değiştirilecek alan')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Sunucu IP', value: 'serverIp' },
                            { name: 'TeamSpeak IP', value: 'serverTs' }
                        )
                )
                .addStringOption(opt =>
                    opt.setName('deger')
                        .setDescription('Yeni adres')
                        .setRequired(true)
                )
        ),

    async autocomplete(interaction) {
        const sub = interaction.options.getSubcommand();
        const focused = interaction.options.getFocused().toLowerCase();
        
        let choices = [];
        if (sub === 'rol') {
            choices = Object.entries(ROLE_LABELS).map(([key, label]) => ({
                name: `${label} (${key})`,
                value: key
            }));
        } else if (sub === 'kanal') {
            choices = Object.entries(CHANNEL_LABELS).map(([key, label]) => ({
                name: `${label} (${key})`,
                value: key
            }));
        }

        const filtered = choices.filter(c =>
            c.name.toLowerCase().includes(focused) || c.value.toLowerCase().includes(focused)
        ).slice(0, 25);

        await interaction.respond(filtered);
    },

    async execute(interaction) {
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Developer veya Sunucu Sahibi kontrolü
        const isDeveloper = config.developers.includes(interaction.user.id);
        const isOwner = interaction.guild?.ownerId === interaction.user.id;

        if (!isDeveloper && !isOwner) {
            return interaction.reply({
                ...embeds.error(
                    interaction.guild?.name || 'FiveM Moderation',
                    '❌ Bu komutu sadece **sunucu sahibi** veya **bot geliştiricileri** kullanabilir.'
                ),
                flags: (1 << 6) | (1 << 15)
            });
        }

        const sub = interaction.options.getSubcommand();
        const alan = interaction.options.getString('alan');

        if (sub === 'rol') {
            if (!(alan in config.roles)) {
                return interaction.reply({
                    ...embeds.error(
                        interaction.guild?.name || 'FiveM Moderation',
                        `❌ \`${alan}\` geçerli bir rol alanı değil.`
                    ),
                    flags: (1 << 6) | (1 << 15)
                });
            }

            const yeniRol = interaction.options.getRole('rol');
            const eskiId = config.roles[alan];
            config.roles[alan] = yeniRol.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            const label = ROLE_LABELS[alan] || alan;
            await interaction.reply({
                ...embeds.success(
                    interaction.guild?.name || 'FiveM Moderation',
                    `✅ **${label}** güncellendi.\n\n**Eski:** ${eskiId ? `<@&${eskiId}>` : 'Boş'}\n**Yeni:** <@&${yeniRol.id}>\n\nBot 3 saniye içinde yeniden başlayacak...`,
                    'Config Güncellendi'
                ),
                flags: (1 << 6) | (1 << 15)
            });

        } else if (sub === 'kanal') {
            if (!(alan in config.channels)) {
                return interaction.reply({
                    ...embeds.error(
                        interaction.guild?.name || 'FiveM Moderation',
                        `❌ \`${alan}\` geçerli bir kanal alanı değil.`
                    ),
                    flags: (1 << 6) | (1 << 15)
                });
            }

            const yeniKanal = interaction.options.getChannel('kanal');
            const eskiId = config.channels[alan];
            config.channels[alan] = yeniKanal.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            const label = CHANNEL_LABELS[alan] || alan;
            await interaction.reply({
                ...embeds.success(
                    interaction.guild?.name || 'FiveM Moderation',
                    `✅ **${label}** güncellendi.\n\n**Eski:** ${eskiId ? `<#${eskiId}>` : 'Boş'}\n**Yeni:** <#${yeniKanal.id}>\n\nBot 3 saniye içinde yeniden başlayacak...`,
                    'Config Güncellendi'
                ),
                flags: (1 << 6) | (1 << 15)
            });
        } else if (sub === 'sunucu') {
            const deger = interaction.options.getString('deger');
            const eskiDeger = config[alan];
            config[alan] = deger;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            const label = alan === 'serverIp' ? 'Sunucu IP' : 'TeamSpeak IP';
            await interaction.reply({
                ...embeds.success(
                    interaction.guild?.name || 'FiveM Moderation',
                    `✅ **${label}** güncellendi.\n\n**Eski:** \`${eskiDeger || 'Boş'}\`\n**Yeni:** \`${deger}\`\n\nBot 3 saniye içinde yeniden başlayacak...`,
                    'Config Güncellendi'
                ),
                flags: (1 << 6) | (1 << 15)
            });
        }

        setTimeout(() => process.exit(0), 3000);
    }
};
