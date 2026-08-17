const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banaffi')
        .setDescription('Kalıcı (perma) banlar harici tüm yasaklamaları kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();
        
        const bans = await interaction.guild.bans.fetch().catch(() => new Map());
        if (bans.size === 0) {
            return interaction.editReply({ ...embeds.warn(interaction.guild.name, 'Sunucuda yasaklı kimse yok.') });
        }

        let unbannedCount = 0;
        let permaCount = 0;

        for (const ban of bans.values()) {
            const isPerma = punishManager.getActivePunish(ban.user.id, 'perma-ban');
            if (isPerma) {
                permaCount++;
                continue;
            }

            try {
                await interaction.guild.members.unban(ban.user.id, `Banaffı - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);
                punishManager.removeActivePunish(ban.user.id, 'ban');
                unbannedCount++;
            } catch (e) {
                // Hata olanları atla
            }
        }

        // Ban Log Kanalına Gönder
        const banLogChannelId = config.channels?.banLogChannel;
        if (banLogChannelId) {
            const banLogChannel = interaction.guild.channels.cache.get(banLogChannelId);
            if (banLogChannel) {
                const logEmbed = embeds.logSuccess(
                    `**İşlem:** Toplu Ban Affı\n**Yetkili:** <@${interaction.user.id}>\n**Kaldırılan Yasak Sayısı:** ${unbannedCount}\n**Korunan Kalıcı Yasak:** ${permaCount}`,
                    'Toplu Ban Affı Uygulandı'
                );
                await banLogChannel.send(logEmbed).catch(() => {});
            }
        }

        await interaction.editReply({ ...embeds.success(interaction.guild.name, `${unbannedCount} kişinin yasağı kaldırıldı. ${permaCount} kalıcı (perma) yasak korundu.`) });
    }
};
