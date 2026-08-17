const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    data: { name: 'ticketRemoveUserModal' },
    async execute(interaction) {
        const userId = interaction.fields.getTextInputValue('userId').trim();

        // Bilet sahibini koruyalım
        const ticket = db.prepare('SELECT * FROM Tickets WHERE channelId = ?').get(interaction.channel.id);
        if (ticket && ticket.userId === userId) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Ticket\'i açan kullanıcı odadan çıkarılamaz.'), flags: (1 << 6) | (1 << 15) });
        }

        let member;
        try {
            member = await interaction.guild.members.fetch(userId);
        } catch (e) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı bulunamadı. Lütfen geçerli bir ID girin.'), flags: (1 << 6) | (1 << 15) });
        }

        if (!member) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı bu sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        try {
            await interaction.channel.permissionOverwrites.edit(member.id, {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            });

            const removeComponents = [
                {
                    type: 10,
                    content: `# Kullanıcı Çıkarıldı\n<@${member.id}> bilet odasından çıkarıldı.`
                }
            ];

            return interaction.reply({ 
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0xf04747, components: removeComponents }]
            });
        } catch (err) {
            console.error('[Ticket] Kullanıcı çıkarılırken hata:', err);
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı çıkarılırken bir hata oluştu.'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
