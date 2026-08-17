const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

const stmts = {
    getTicket: db.prepare('SELECT * FROM Tickets WHERE channelId = ? AND status = ?'),
    updateClaimedBy: db.prepare('UPDATE Tickets SET claimedBy = ? WHERE channelId = ?')
};

module.exports = {
    data: { name: 'ticketClaim' },
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu işlemi sadece yetkililer yapabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        const channelId = interaction.channel.id;
        const ticket = stmts.getTicket.get(channelId, 'open');

        if (!ticket) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu kanal geçerli ve açık bir Ticket değil.'), flags: (1 << 6) | (1 << 15) });
        }

        if (ticket.claimedBy) {
            if (ticket.claimedBy === interaction.user.id) {
                return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu Ticket zaten sizin tarafınızdan alınmış!'), flags: (1 << 6) | (1 << 15) });
            }

            // Yetkili Değişimi (Transfer)
            const oldStaffId = ticket.claimedBy;
            stmts.updateClaimedBy.run(interaction.user.id, channelId);

            const transferComponents = [
                {
                    type: 10,
                    content: `# Yetkili Değişimi\nBilgilendirme: Bu Ticket'in yönetimi, yetkili <@${oldStaffId}> tarafından sistem üzerinden <@${interaction.user.id}> yetkilisine devredilmiştir.\n\n> İşlemleriniz kaldığı yerden devam edecektir. Yeni yetkilinizin konuyu incelemesini bekleyin.\n\n---\n**Devir Detayları**\n- **Devreden Yetkili:** <@${oldStaffId}>\n- **Atanan Yeni Yetkili:** <@${interaction.user.id}>\n- **Güncel Durum:** \`Geçiş Yapıldı (Bekleniyor)\``
                }
            ];

            return interaction.reply({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0xfaa61a, components: transferComponents }]
            });
        }

        // İlk kez alınması - Veritabanını hemen güncelle
        stmts.updateClaimedBy.run(interaction.user.id, channelId);

        const claimComponents = [
            {
                type: 10,
                content: `# Bilet Üstlenildi\nBu Ticket'in yönetimi <@${interaction.user.id}> tarafından üstlenildi.\n\n> Yetkilimiz en kısa sürede sorununuzla ilgilenecektir.`
            }
        ];

        // Önce butona anında yanıt ver (Timeout yaşanmaması için)
        await interaction.reply({
            flags: (1 << 15),
            components: [{ type: 17, accent_color: 0x43b581, components: claimComponents }]
        });

        // Kanal adını arka planda asenkron olarak güncelle (Rate limit / timeout engellemek için)
        (async () => {
            try {
                const creator = interaction.client.users.cache.get(ticket.userId) 
                    || await interaction.client.users.fetch(ticket.userId).catch(() => null);
                if (creator) {
                    const newName = `alındı-${creator.username.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
                    await interaction.channel.setName(newName).catch(() => null);
                }
            } catch (err) {
                console.error('[Ticket] Kanal adı değiştirilemedi:', err.message);
            }
        })();
    }
};
