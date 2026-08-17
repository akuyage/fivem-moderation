const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dagit')
        .setDescription('Bulunduğunuz kanaldaki herkesi diğer ses kanallarına (Public/Genel) rastgele dağıtır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

    async execute(interaction) {
        const myVoiceChannel = interaction.member.voice.channel;
        if (!myVoiceChannel) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Öncelikle dağıtılacak üyelerin bulunduğu sesli kanala katılmalısınız.'), flags: (1 << 6) | (1 << 15) });
        }

        const membersToMove = myVoiceChannel.members.filter(m => !m.user.bot);
        if (membersToMove.size === 0) {
            return interaction.reply({ ...embeds.warn(interaction.guild.name, 'Kanalda dağıtılacak kimse yok.'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply();

        // Sunucudaki diğer boş veya public ses kanallarını bul
        const allVoiceChannels = interaction.guild.channels.cache.filter(c => c.type === 2 && c.id !== myVoiceChannel.id); // 2 = GuildVoice
        
        if (allVoiceChannels.size === 0) {
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Dağıtım yapılabilecek başka bir ses kanalı bulunamadı.') });
        }

        const channelsArray = Array.from(allVoiceChannels.values());
        let movedCount = 0;

        for (const member of membersToMove.values()) {
            const randomChannel = channelsArray[Math.floor(Math.random() * channelsArray.length)];
            await member.voice.setChannel(randomChannel).catch(() => {});
            movedCount++;
        }

        await interaction.editReply({ ...embeds.success(interaction.guild.name, `Kanalınızdaki ${movedCount} üye diğer odalara başarıyla dağıtıldı.`) });
    }
};
