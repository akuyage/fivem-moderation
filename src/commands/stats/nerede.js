const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nerede')
        .setDescription('Bir kullanıcının hangi sesli kanalda olduğunu gösterir.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Bulunacak kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanici');
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kullanıcı sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ ...embeds.info(interaction.guild.name, `${targetUser.tag} şu anda hiçbir sesli kanalda bulunmuyor.`) });
        }

        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} şu anda <#${voiceChannel.id}> adlı kanalda bulunuyor.`) });
    }
};
