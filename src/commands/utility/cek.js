const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cek')
        .setDescription('Belirtilen kullanıcıyı bulunduğunuz ses kanalına çeker.')
        .addUserOption(option => option.setName('kullanici').setDescription('Çekilecek kullanıcı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanici');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member || !member.voice.channel) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Belirtilen kullanıcı sesli bir kanalda değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const myVoiceChannel = interaction.member.voice.channel;
        if (!myVoiceChannel) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Öncelikle bir sesli kanala katılmalısınız.'), flags: (1 << 6) | (1 << 15) });
        }

        if (member.voice.channelId === myVoiceChannel.id) {
            return interaction.reply({ ...embeds.warn(interaction.guild.name, 'Kullanıcı zaten sizinle aynı kanalda.'), flags: (1 << 6) | (1 << 15) });
        }

        await member.voice.setChannel(myVoiceChannel);
        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} başarıyla yanınıza çekildi.`) });
    }
};
