const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan yasaklar.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Yasaklanacak kullanıcı')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Yasaklama sebebi')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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

        // SQLite'a kaydet
        punishManager.addPunish(targetUser.id, interaction.user.id, 'ban', reason);

        // Discord'dan yasakla
        await interaction.guild.members.ban(targetUser.id, { reason: `${reason} - Sorumlu: ${interaction.user.tag} (${interaction.user.id})` });

        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} başarıyla yasaklandı.\nSebep: ${reason}`) });

        // Ban Log Kanalına Gönder
        const banLogChannel = interaction.guild.channels.cache.get(config.channels?.banLogChannel);
        if (banLogChannel) {
            const logEmbed = embeds.logError(`**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Yetkili:** <@${interaction.user.id}>\n**Sebep:** ${reason}`, 'Kullanıcı Yasaklandı');

            await banLogChannel.send(logEmbed).catch(() => {});
        }
    }
};
