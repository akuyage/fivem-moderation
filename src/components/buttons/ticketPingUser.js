const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'ticketPingUser' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const channelId = interaction.channel.id;
        const ticket = db.prepare('SELECT rowid as id, * FROM Tickets WHERE channelId = ? AND status = ?').get(channelId, 'open');

        if (!ticket) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu kanal geçerli ve açık bir Ticket değil.'), flags: (1 << 6) | (1 << 15) });
        }

        try {
            const user = await interaction.client.users.fetch(ticket.userId);
            if (!user) {
                return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı bulunamadı.'), flags: (1 << 6) | (1 << 15) });
            }

            const channelLink = `https://discord.com/channels/${interaction.guild.id}/${ticket.channelId}`;
            
            const pingComponents = [
                {
                    type: 10,
                    content: `**${interaction.guild.name}** sunucusundaki ${channelLink} destek talebinizde yetkililerimiz sizden acil yanıt bekliyor! Lütfen talebinizi kontrol edin.`
                }
            ];

            await user.send({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0x5865F2, components: pingComponents }]
            });

            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcıya DM üzerinden acil yanıt bildirimi gönderildi.'), flags: (1 << 6) | (1 << 15) });
        } catch (error) {
            console.error('[Ticket] Kullanıcıya DM gönderilemedi:', error);
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcıya DM gönderilemedi. (DM\'leri kapalı olabilir)'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
