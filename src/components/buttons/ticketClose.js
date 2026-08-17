const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const generateTranscript = require('../../utils/transcriptGenerator');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'ticketClose' },
    async execute(interaction) {
        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) }).catch(() => {});
        const action = interaction.customId.split('_')[1]; // 'staff' veya 'user' olabilir
        const channelId = interaction.channel.id;
        const ticket = db.prepare('SELECT rowid as id, * FROM Tickets WHERE channelId = ? AND status = ?').get(channelId, 'open');

        if (!ticket) {
            return interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu kanal geçerli ve açık bir Ticket değil.'), flags: (1 << 6) | (1 << 15) });
        }

        const isCreator = interaction.user.id === ticket.userId;
        const isStaff = interaction.member.roles.cache.has(config.roles.staff) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (action === 'staff' && !isStaff) {
            return interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Bu butonu sadece yetkililer kullanabilir.'), flags: (1 << 6) | (1 << 15) });
        }
        if (action === 'user' && !isCreator) {
            return interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', "Bu butonu sadece Ticket'i oluşturan oyuncu kullanabilir."), flags: (1 << 6) | (1 << 15) });
        }
        if (!isCreator && !isStaff) {
            return interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', "Bu Ticket'i kapatma yetkiniz yok."), flags: (1 << 6) | (1 << 15) });
        }

        db.prepare('UPDATE Tickets SET status = ? WHERE channelId = ?').run('closed', channelId);
        const closeReason = action === 'staff' ? 'Yetkili Tarafından Kapatıldı' : (action === 'user' ? 'Kullanıcı Tarafından Kapatıldı' : 'Belirtilmedi');

        await interaction.editReply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Ticket kapatılıyor, lütfen bekleyin...'), flags: (1 << 6) | (1 << 15) });

        setImmediate(async () => {
            try {
                const logChannelId = config.channels.ticketLogChannel || config.channels.logChannel;
                const logChannel = interaction.guild.channels.cache.get(logChannelId);

                if (logChannel) {
                    let creatorUser = null;
                    try { creatorUser = await interaction.client.users.fetch(ticket.userId); } catch (e) {}
                    const creatorName = creatorUser ? creatorUser.username : 'Bilinmiyor';

                    let claimedByName = 'Bulunmuyor';
                    if (ticket.claimedBy) {
                        try {
                            const claimedByUser = await interaction.client.users.fetch(ticket.claimedBy);
                            claimedByName = claimedByUser.username;
                        } catch (e) {}
                    }

                    const metadata = {
                        creatorName: creatorName,
                        creatorId: ticket.userId,
                        claimedByName: claimedByName,
                        claimedById: ticket.claimedBy || 'Bulunmuyor',
                        closerName: interaction.user.username,
                        closerId: interaction.user.id,
                        closeReason: closeReason
                    };

                    const transcriptHtml = await generateTranscript(interaction.channel, ticket, metadata);

                    // Transkripti veritabanına kaydet
                    db.prepare('INSERT OR REPLACE INTO Transcripts (ticketId, html) VALUES (?, ?)').run(ticket.id, transcriptHtml);

                    // Yetkili İstatistiğini Güncelle
                    if (ticket.claimedBy) {
                        db.prepare('INSERT OR IGNORE INTO StaffStats (userId) VALUES (?)').run(ticket.claimedBy);
                        db.prepare('UPDATE StaffStats SET ticketsHandled = ticketsHandled + 1 WHERE userId = ?').run(ticket.claimedBy);
                    }

                    const containerComponents = [
                        {
                            type: 10,
                            content: `# ${ticket.category || 'Destek'} Log (#${ticket.id})\n**Oluşturan:** ${creatorName} ( \`${ticket.userId}\` )\n**Kapatan:** ${interaction.user.username} ( \`${interaction.user.id}\` )\n**Sebep:** \`${closeReason}\`\n**Kategori:** \`${ticket.category || 'Destek'}\``
                        },
                        { type: 14 },
                        {
                            type: 1,
                            components: [{ type: 2, custom_id: `getTranscript_${ticket.id}`, label: 'Transkripte Git', style: 2 }]
                        }
                    ];

                    await logChannel.send({
                        flags: (1 << 15),
                        components: [{ type: 17, accent_color: 0x2f3136, components: containerComponents }]
                    });
                }
            } catch (error) {
                console.error('[Ticket] Log oluşturulurken hata:', error);
            }

            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('[Ticket] Kanal silinemedi:', err);
            }
        });
    }
};
