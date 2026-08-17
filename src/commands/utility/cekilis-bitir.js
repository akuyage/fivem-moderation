const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilis-bitir')
        .setDescription('Belirtilen çekilişi hemen sonlandırır.')
        .addStringOption(option =>
            option.setName('mesaj_id')
                .setDescription('Çekiliş mesajının ID\'si')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageId = interaction.options.getString('mesaj_id');
        const giveaway = db.prepare('SELECT * FROM Giveaways WHERE messageId = ? AND guildId = ? AND status = ?').get(messageId, interaction.guild.id, 'active');

        if (!giveaway) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu ID\'ye sahip aktif bir çekiliş bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        const giveawayManager = require('../../utils/giveawayManager');
        if (giveawayManager.processGiveaway) {
            await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });
            await giveawayManager.processGiveaway(interaction.client, giveaway);
            return interaction.editReply(embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Çekiliş sonlandırıldı.'));
        } else {
            db.prepare('UPDATE Giveaways SET endTime = ? WHERE messageId = ?').run(Date.now() - 1000, messageId);
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Çekiliş sonlandırılma kuyruğuna alındı.'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
