const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilis-reroll')
        .setDescription('Biten bir çekiliş için yeni kazanan(lar) belirler.')
        .addStringOption(option =>
            option.setName('mesaj_id')
                .setDescription('Çekiliş mesajının ID\'si')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const messageId = interaction.options.getString('mesaj_id');
        const giveaway = db.prepare('SELECT * FROM Giveaways WHERE messageId = ? AND guildId = ? AND status = ?').get(messageId, interaction.guild.id, 'ended');

        if (!giveaway) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu ID\'ye sahip bitmiş bir çekiliş bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        const participants = db.prepare('SELECT userId FROM GiveawayParticipants WHERE messageId = ?').all(messageId);

        if (participants.length === 0) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu çekilişte yeterli katılımcı bulunmuyor.'), flags: (1 << 6) | (1 << 15) });
        }

        let winners = [];
        let winnersCount = giveaway.winnersCount > participants.length ? participants.length : giveaway.winnersCount;

        let pool = [...participants];
        for (let i = 0; i < winnersCount; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            winners.push(pool[randomIndex].userId);
            pool.splice(randomIndex, 1);
        }

        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (channel) {
            await channel.send({
                content: `**REROLL** \`${giveaway.prize}\` çekilişinin yeni kazananları:\n${winnerMentions}\nTebrikler! (${giveaway.messageId})`
            });
        }

        // Kazananlara DM Gönder
        let hostTag = `${interaction.user.username} - ${interaction.user.id}`;
        
        const row = {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'dm_sender_info',
                    label: hostTag,
                    style: 2,
                    disabled: true
                },
                {
                    type: 2,
                    label: interaction.guild.name,
                    style: 5, // Link
                    url: `https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`
                }
            ]
        };

        for (const winnerId of winners) {
            try {
                const winnerMember = await interaction.guild.members.fetch(winnerId).catch(() => null);
                if (winnerMember) {
                    await winnerMember.send({
                        content: `**Tebrikler!** \`${interaction.guild.name}\` sunucusunda **${giveaway.prize}** çekilişinin yeni kazananı oldunuz!`,
                        components: [row]
                    }).catch(() => {});
                }
            } catch (dmErr) {}
        }

        return interaction.reply({ ...embeds.success(interaction.guild?.name || 'FiveM Moderation', '✅ Yeni kazananlar belirlendi ve duyuruldu.'), flags: (1 << 6) | (1 << 15) });
    }
};
