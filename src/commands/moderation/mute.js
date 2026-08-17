const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const punishManager = require('../../database/punishManager');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Kullanıcıyı süreli olarak susturur (Timeout).')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Susturulacak kullanıcı')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('sure')
                .setDescription('Süre (dakika cinsinden)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('sebep')
                .setDescription('Susturma sebebi')
                .setRequired(false))
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
        const durationMin = interaction.options.getInteger('sure');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kendinizi susturamazsınız!'), flags: (1 << 6) | (1 << 15) });
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kullanıcı sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }
        
        if (!targetMember.moderatable) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu kullanıcıyı susturmaya yetkim yok!'), flags: (1 << 6) | (1 << 15) });
        }

        const durationMs = durationMin * 60 * 1000;
        
        // SQLite'a kaydet
        punishManager.addPunish(targetUser.id, interaction.user.id, 'mute', reason, durationMs);

        // Discord API (Timeout)
        await targetMember.timeout(durationMs, `${reason} - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);

        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} başarıyla **${durationMin} dakika** susturuldu.\nSebep: ${reason}`) });

        // Punish Log Kanalına Gönder
        const punishLogChannel = interaction.guild.channels.cache.get(config.channels?.punishLogChannel);
        if (punishLogChannel) {
            const logEmbed = embeds.logWarn(`**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n**Yetkili:** <@${interaction.user.id}>\n**Süre:** ${durationMin} dakika\n**Sebep:** ${reason}`, 'Kullanıcı Susturuldu');

            await punishLogChannel.send(logEmbed).catch(() => {});
        }
    }
};
