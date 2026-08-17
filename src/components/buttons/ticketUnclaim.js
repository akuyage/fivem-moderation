const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

const stmts = {
    getTicket: db.prepare('SELECT * FROM Tickets WHERE channelId = ? AND status = ?'),
    unclaimTicket: db.prepare('UPDATE Tickets SET claimedBy = NULL WHERE channelId = ?')
};

module.exports = {
    data: { name: 'ticketUnclaim' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const channelId = interaction.channel.id;
        const ticket = stmts.getTicket.get(channelId, 'open');

        if (!ticket) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu kanal geçerli ve açık bir Ticket değil.'), flags: (1 << 6) | (1 << 15) });
        }

        if (!ticket.claimedBy) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu Ticket henüz kimse tarafından alınmamış.'), flags: (1 << 6) | (1 << 15) });
        }

        if (ticket.claimedBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', `Bu Ticket'i sadece ilgilenen yetkili (<@${ticket.claimedBy}>) veya bir Yönetici bırakabilir.`), flags: (1 << 6) | (1 << 15) });
        }

        stmts.unclaimTicket.run(channelId);

        const unclaimComponents = [
            {
                type: 10,
                content: `# Bilet Bırakıldı\n<@${interaction.user.id}> bu Ticket'i bıraktı. Diğer yetkililer ilgilenebilir.`
            }
        ];

        // Anında yanıt ver
        await interaction.reply({ 
            flags: (1 << 15),
            components: [{ type: 17, accent_color: 0x2f3136, components: unclaimComponents }]
        });

        // Arka planda kanal adını güncelle
        (async () => {
            try {
                const creator = interaction.client.users.cache.get(ticket.userId) 
                    || await interaction.client.users.fetch(ticket.userId).catch(() => null);
                const safeName = creator ? creator.username.toLowerCase().replace(/[^a-z0-9_-]/g, '') : 'ticket';
                const newName = `ticket-${safeName}`;
                await interaction.channel.setName(newName).catch(() => null);
            } catch (err) {
                console.error('[Ticket] Kanal adı değiştirilemedi:', err.message);
            }
        })();
    }
};
