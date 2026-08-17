const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allmute')
        .setDescription('Bulunduğunuz ses kanalındaki (veya belirtilen kanaldaki) herkesi susturur.')
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Susturulacak ses kanalı (boş bırakırsanız bulunduğunuz kanal)')
                .addChannelTypes(2) // 2 = GuildVoice
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

    async execute(interaction) {
        // Staff rolü kontrolü
        const staffRoleId = config.roles.staff;
        const isStaff = interaction.member.roles.cache.has(staffRoleId);
        
        // Admin veya Staff rolü gerekli
        if (!interaction.member.permissions.has(PermissionFlagsBits.MuteMembers) && !isStaff) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu komutu kullanmak için Ses Sustur yetkisine veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        const channel = interaction.options.getChannel('kanal') || interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bir ses kanalında olmalı veya kanal belirtmelisiniz!'), flags: (1 << 6) | (1 << 15) });
        }

        if (channel.members.size === 0) {
            return interaction.reply({ ...embeds.warn(interaction.guild.name, 'Kanalda kimse yok.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply();

        let count = 0;
        for (const member of channel.members.values()) {
            if (!member.voice.serverMute) {
                await member.voice.setMute(true, `AllMute - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`).catch(() => {});
                count++;
            }
        }

        await interaction.editReply({ ...embeds.success(interaction.guild.name, `${channel.name} kanalındaki ${count} kullanıcı susturuldu.`) });
    }
};
