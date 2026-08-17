const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kaldir')
        .setDescription('Kurulum komutu tarafından oluşturulan tüm kanal ve kategorileri siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Developer Kontrolü
        if (!config.developers.includes(interaction.user.id)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu sadece bot geliştiricileri kullanabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply();

        const guild = interaction.guild;

        try {
            // Silinecek kanal ve kategori ID'lerini topla
            const channelsToDelete = [...new Set([
                config.channels.messageLogChannel,
                config.channels.voiceLogChannel,
                config.channels.roleLogChannel,
                config.channels.channelLogChannel,
                config.channels.nameLogChannel,
                config.channels.securityLogChannel,
                config.channels.joinedLogChannel,
                config.channels.leavedLogChannel,
                config.channels.commandLogChannel,
                config.channels.warningLogChannel,
                config.channels.punishLogChannel,
                config.channels.kickLogChannel,
                config.channels.banLogChannel,
                config.channels.whitelistPunishLog,
                config.channels.inviteLogChannel,
                config.channels.inviteReportLog,
                config.channels.yetkiliBasvuruLogChannel,
                config.channels.ticketLogChannel,
                config.channels.interviewLog,
                config.channels.interviewSystem,
                config.channels.ekipDavetLogChannel,
                config.channels.systemLogCategory,
                config.channels.memberLogCategory,
                config.channels.moderationLogCategory
            ].filter(id => id && id !== ''))];

            let deletedCount = 0;

            // Kanalları ve kategorileri sil
            for (const channelId of channelsToDelete) {
                try {
                    const channel = await guild.channels.fetch(channelId);
                    if (channel) {
                        await channel.delete();
                        deletedCount++;
                    }
                } catch (error) {
                    // Kanal bulunamazsa veya silinemezse devam et
                    continue;
                }
            }

            // Config'i sıfırla

            config.channels.messageLogChannel = '';
            config.channels.voiceLogChannel = '';
            config.channels.roleLogChannel = '';
            config.channels.channelLogChannel = '';
            config.channels.nameLogChannel = '';
            config.channels.securityLogChannel = '';
            config.channels.joinedLogChannel = '';
            config.channels.leavedLogChannel = '';
            config.channels.commandLogChannel = '';
            config.channels.warningLogChannel = '';
            config.channels.punishLogChannel = '';
            config.channels.kickLogChannel = '';
            config.channels.banLogChannel = '';
            config.channels.whitelistPunishLog = '';
            config.channels.inviteLogChannel = '';
            config.channels.inviteReportLog = '';
            config.channels.yetkiliBasvuruLogChannel = '';
            config.channels.ticketLogChannel = '';
            config.channels.interviewWaiting = '';
            config.channels.interviewLog = '';
            config.channels.icName = '';
            config.channels.teamInviteChannel = '';
            config.channels.ticketCategory = '';
            config.channels.teamCategory = '';
            config.channels.interviewCategory = '';
            config.channels.interviewSystem = '';
            config.channels.ekipDavetLogChannel = '';
            config.channels.systemLogCategory = '';
            config.channels.memberLogCategory = '';
            config.channels.moderationLogCategory = '';

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Sonuç paneli
            await interaction.editReply({
                flags: (1 << 15),
                components: [
                    {
                        type: 17,
                        accent_color: 0xf04747,
                        components: [
                            {
                                type: 10,
                                content: `# FiveM Moderation - Kurulum Kaldırıldı!`
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `**Silinen Kanal/Kategori Sayısı:** ${deletedCount}`
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
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Kaldırma sırasında bir hata oluştu. Lütfen botun "Kanalları Yönet" ve "Kategorileri Yönet" yetkisi olduğundan emin olun.') });
        }
    }
};
