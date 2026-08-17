const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perma-unban')
        .setDescription('Kalıcı yasaklamayı kaldırır.')
        .addStringOption(option => 
            option.setName('id')
                .setDescription("Yasağı kaldırılacak kullanıcının ID'si")
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetId = interaction.options.getString('id');

        try {
            await interaction.guild.members.unban(targetId, `Perma Unban - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);
            punishManager.removeActivePunish(targetId, 'perma-ban');
            punishManager.removeActivePunish(targetId, 'ban');
            
            // Ban Log Kanalına Gönder
            const banLogChannel = interaction.guild.channels.cache.get(config.channels?.banLogChannel);
            if (banLogChannel) {
                const logEmbed = embeds.logSuccess(`**Kullanıcı:** <@${targetId}> (\`${targetId}\`)\n**Yetkili:** <@${interaction.user.id}>\n**İşlem:** Kalıcı Yasak Kaldırıldı`, 'Kalıcı Yasak Kaldırıldı');
                await banLogChannel.send(logEmbed).catch(() => {});
            }

            await interaction.reply({ ...embeds.success(interaction.guild.name, `<@${targetId}> ID'li kullanıcının kalıcı yasağı kaldırıldı.`) });
        } catch (error) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, "Bu ID'ye sahip yasaklı bir kullanıcı bulunamadı veya bir hata oluştu."), flags: (1 << 6) | (1 << 15) });
        }
    }
};
