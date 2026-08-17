const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perma-ban')
        .setDescription('Kullanıcıyı kalıcı olarak (affedilemez) yasaklar.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Kalıcı yasaklanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Yasaklama sebebi')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kendinizi yasaklayamazsınız!'), flags: (1 << 6) | (1 << 15) });
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember && !targetMember.bannable) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu kullanıcıyı yasaklamaya yetkim yok!'), flags: (1 << 6) | (1 << 15) });
        }

        punishManager.addPunish(targetUser.id, interaction.user.id, 'perma-ban', reason);
        await interaction.guild.members.ban(targetUser.id, { reason: `[PERMA] ${reason} - Sorumlu: ${interaction.user.tag} (${interaction.user.id})` });

        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} kalıcı olarak yasaklandı.\n> **Sebep:** ${reason}`) });

        // Ban Log Kanalına Gönder
        const banLogChannel = interaction.guild.channels.cache.get(config.channels?.banLogChannel);
        if (banLogChannel) {
            const logEmbed = embeds.logError(`**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Yetkili:** <@${interaction.user.id}>\n**Tür:** Kalıcı (Perma) Ban\n**Sebep:** ${reason}`, 'Kullanıcı Kalıcı Olarak Yasaklandı');
            await banLogChannel.send(logEmbed).catch(() => {});
        }
    }
};
