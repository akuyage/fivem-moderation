const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Kullanıcının süreli susturmasını erken kaldırır.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Susturması kaldırılacak kullanıcı')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Staff rolü kontrolü
        const staffRoleId = config.roles.staff;
        const isStaff = interaction.member.roles.cache.has(staffRoleId);
        
        // Admin veya Staff rolü gerekli
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !isStaff) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu komutu kullanmak için Üye Yönet yetkisine veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }
        const targetUser = interaction.options.getUser('kullanici');

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kullanıcı sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        if (!targetMember.isCommunicationDisabled()) {
            return interaction.reply({ ...embeds.warn(interaction.guild.name, 'Bu kullanıcı zaten susturulmuş değil.'), flags: (1 << 6) | (1 << 15) });
        }

        punishManager.removeActivePunish(targetUser.id, 'mute');
        await targetMember.timeout(null, `Erken Unmute - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);

        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} kullanıcısının susturması başarıyla kaldırıldı.`) });

        // Punish Log Kanalına Gönder
        const punishLogChannel = interaction.guild.channels.cache.get(config.channels?.punishLogChannel);
        if (punishLogChannel) {
            const logEmbed = embeds.logSuccess(`**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Yetkililer:** <@${interaction.user.id}>\n**İşlem:** Susturma Kaldırıldı`, 'Susturma Kaldırıldı');

            await punishLogChannel.send(logEmbed).catch(() => {});
        }
    }
};
