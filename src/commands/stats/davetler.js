const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('davetler')
        .setDescription('Davet istatistiklerinizi görüntüler.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Davetlerine bakılacak kullanıcı')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanici') || interaction.user;

        if (targetUser.bot) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Botların davet istatistikleri olmaz.'), flags: (1 << 6) | (1 << 15) });
        }

        const stats = db.prepare('SELECT * FROM InviteStats WHERE userId = ?').get(targetUser.id);
        
        if (!stats) {
            return interaction.reply({ ...embeds.info(interaction.guild.name, `${targetUser.tag} kullanıcısının henüz hiç daveti bulunmuyor.`) });
        }

        const net = stats.regular - stats.leaves - stats.fake;
        
        const desc = `
**Toplam Davet:** ${stats.total}
**Geçerli:** ${stats.regular}
**Ayrılanlar:** ${stats.leaves}
**Sahte:** ${stats.fake}
        
👉 **Net Geçerli Davet:** \`${net}\`
        `;

        await interaction.reply({ ...embeds.info(interaction.guild.name, desc, `${targetUser.tag} Davet İstatistikleri`) });
    }
};
