const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../database/connect');
const canvasBuilder = require('../../utils/canvasBuilder');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanici-bilgi')
        .setDescription('Kendinizin veya bir başkasının istatistik kartını gösterir.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Bilgilerine bakılacak kullanıcı')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const targetUser = interaction.options.getUser('kullanici') || interaction.user;

        if (targetUser.bot) {
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Botların istatistikleri tutulmaz.') });
        }

        let userStats = db.prepare('SELECT * FROM Users WHERE userId = ?').get(targetUser.id);
        
        if (!userStats) {
            userStats = { userId: targetUser.id, messageCount: 0, voiceTime: 0, level: 1, xp: 0, invites: 0 };
        }

        try {
            const buffer = await canvasBuilder.buildProfileCard(targetUser, userStats);
            const attachment = new AttachmentBuilder(buffer, { name: 'profile-card.png' });
            
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ ...embeds.error(interaction.guild.name, 'Profil kartı oluşturulurken bir hata meydana geldi.') });
        }
    }
};
