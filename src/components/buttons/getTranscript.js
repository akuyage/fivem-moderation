const { AttachmentBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    data: { name: 'getTranscript' },
    async execute(interaction) {
        // Butonun custom_id'si "getTranscript_123" şeklinde geliyor
        const parts = interaction.customId.split('_');
        const ticketId = parts[1];

        if (!ticketId) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Transkript ID\'si bulunamadı.'), flags: (1 << 6) });
        }

        const transcriptData = db.prepare('SELECT html FROM Transcripts WHERE ticketId = ?').get(ticketId);

        if (!transcriptData || !transcriptData.html) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', "Bu Ticket'in transkript dosyası sistemde bulunamadı."), flags: (1 << 6) | (1 << 15) });
        }

        // HTML stringini Buffer'a çevirip attachment oluşturuyoruz
        const buffer = Buffer.from(transcriptData.html, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticketId}.html` });

        return interaction.reply({ 
            content: `📑 **Ticket (#${ticketId}) Transkripti**`, 
            files: [attachment], 
            flags: (1 << 6) // Sadece butona basan kişiye görünür (ephemeral) — IS_COMPONENTS_V2 content ile birlikte kullanılamaz
        });
    }
};
