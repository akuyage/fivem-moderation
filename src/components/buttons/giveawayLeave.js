const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'giveawayLeave' },
    async execute(interaction) {
        const messageId = interaction.message.id;
        const userId = interaction.user.id;

        // Çekiliş aktif mi kontrol et
        const giveaway = db.prepare('SELECT * FROM Giveaways WHERE messageId = ? AND status = ?').get(messageId, 'active');

        if (!giveaway) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu çekiliş artık aktif değil veya bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        // Katılımcıyı kontrol et
        const existingParticipant = db.prepare('SELECT * FROM GiveawayParticipants WHERE messageId = ? AND userId = ?').get(messageId, userId);

        if (!existingParticipant) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Çekilişe katılmadan ayrılamazsınız!'), flags: (1 << 6) | (1 << 15) });
        }

        // Katılımcıyı sil
        db.prepare('DELETE FROM GiveawayParticipants WHERE messageId = ? AND userId = ?').run(messageId, userId);

        // Katılımcı sayısını güncelle (mesajdaki alt bilgi)
        try {
            const participantCount = db.prepare('SELECT COUNT(*) as count FROM GiveawayParticipants WHERE messageId = ?').get(messageId).count;
            
            const currentComponents = interaction.message.components;
            if (currentComponents && currentComponents.length > 0) {
                const containerRaw = currentComponents[0].toJSON ? currentComponents[0].toJSON() : currentComponents[0];
                
                if (containerRaw.type === 17 && containerRaw.components) {
                    for (let i = containerRaw.components.length - 1; i >= 0; i--) {
                        if (containerRaw.components[i].type === 10 && containerRaw.components[i].content.includes('Katılımcı:')) {
                            containerRaw.components[i].content = `-# Katılımcı: ${participantCount} | ${interaction.client.user.username} Çekiliş Sistemi`;
                            break;
                        }
                    }

                    await interaction.message.edit({
                        flags: (1 << 15),
                        components: [containerRaw]
                    });
                }
            }
        } catch (error) {
            console.error('Çekiliş mesajı güncellenirken hata oluştu:', error);
        }

        return interaction.reply({ ...embeds.success(interaction.guild?.name || 'FiveM Moderation', 'Çekilişten başarıyla ayrıldınız!'), flags: (1 << 6) | (1 << 15) });
    }
};
