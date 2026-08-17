const db = require('../database/connect');

const stmts = {
    updateStatus: db.prepare('UPDATE Giveaways SET status = ? WHERE messageId = ?'),
    getParticipants: db.prepare('SELECT userId FROM GiveawayParticipants WHERE messageId = ?'),
    getExpiredGiveaways: db.prepare('SELECT * FROM Giveaways WHERE endTime <= ? AND status = ?')
};

async function processGiveaway(client, giveaway) {
    // Çekilişi ended olarak işaretle ki bir sonraki döngüde tekrar tetiklenmesin
    stmts.updateStatus.run('ended', giveaway.messageId);

    try {
        const guild = client.guilds.cache.get(giveaway.guildId)
            || await client.guilds.fetch(giveaway.guildId).catch(() => null);
        if (!guild) return;

        const channel = guild.channels.cache.get(giveaway.channelId)
            || await guild.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) return;

        const participants = stmts.getParticipants.all(giveaway.messageId);

        let winners = [];
        let winnerText = '';

        if (participants.length === 0) {
            winnerText = 'Kayıtlı katılımcı bulunamadı. Çekiliş iptal edildi.';
        } else {
            let pool = [...participants];
            let winnersCount = giveaway.winnersCount > pool.length ? pool.length : giveaway.winnersCount;

            for (let i = 0; i < winnersCount; i++) {
                const randomIndex = Math.floor(Math.random() * pool.length);
                winners.push(pool[randomIndex].userId);
                pool.splice(randomIndex, 1);
            }

            const mentions = winners.map(id => `<@${id}>`).join(', ');
            winnerText = `Tebrikler ${mentions}! **${giveaway.prize}** kazandınız!`;

            // Kazananlara DM Gönder
            let hostTag = `${client.user.username} - ${client.user.id}`;
            try {
                const hostUser = await client.users.fetch(giveaway.hostId);
                if (hostUser) hostTag = `${hostUser.username} - ${hostUser.id}`;
            } catch (e) {}

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
                        label: guild.name,
                        style: 5, // Link
                        url: `https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`
                    }
                ]
            };

            for (const winnerId of winners) {
                try {
                    const winnerMember = await guild.members.fetch(winnerId).catch(() => null);
                    if (winnerMember) {
                        await winnerMember.send({
                            content: `**Tebrikler!** \`${guild.name}\` sunucusunda **${giveaway.prize}** çekilişini kazandınız!`,
                            components: [row]
                        }).catch(() => {});
                    }
                } catch (dmErr) {}
            }
        }

        // Mesajdaki butonu pasif (disabled) hale getir (Hem Components V2 Container hem standart ActionRow uyumlu)
        try {
            const message = await channel.messages.fetch(giveaway.messageId);
            if (message && message.components && message.components.length > 0) {
                const rawComponents = message.components.map(c => (typeof c.toJSON === 'function' ? c.toJSON() : JSON.parse(JSON.stringify(c))));
                
                // 1. Components V2 Container (type 17) formatı
                if (rawComponents[0] && rawComponents[0].type === 17) {
                    const container = rawComponents[0];
                    if (Array.isArray(container.components)) {
                        for (const section of container.components) {
                            if (section.type === 1 && Array.isArray(section.components)) { // ActionRow
                                for (const btn of section.components) {
                                    if (btn.type === 2) {
                                        btn.disabled = true;
                                        btn.label = 'Çekiliş Sona Erdi';
                                        btn.style = 2; // Secondary (gri)
                                    }
                                }
                            }
                        }
                    }
                    
                    await message.edit({
                        flags: (1 << 15),
                        components: [container]
                    }).catch(() => null);
                } 
                // 2. Standart Discord ActionRow (type 1) formatı
                else {
                    const updatedRows = rawComponents.map(row => {
                        if (row.type === 1 && Array.isArray(row.components)) {
                            return {
                                ...row,
                                components: row.components.map(btn => {
                                    if (btn.type === 2) {
                                        return {
                                            ...btn,
                                            disabled: true,
                                            label: 'Çekiliş Sona Erdi',
                                            style: 2
                                        };
                                    }
                                    return btn;
                                })
                            };
                        }
                        return row;
                    });

                    await message.edit({
                        components: updatedRows
                    }).catch(() => null);
                }
            }
        } catch (msgErr) {
            console.error(`[Çekiliş] Mesaj güncellenemedi (${giveaway.messageId}):`, msgErr.message);
        }

        // Kazananları duyur
        await channel.send({
            content: `**ÇEKİLİŞ SONUÇLANDI!**\n**Ödül:** \`${giveaway.prize}\`\n${winnerText}\n[Çekiliş Mesajına Git](https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId})`
        });

    } catch (err) {
        console.error(`[Çekiliş] Çekiliş sonuçlandırılırken hata oluştu (${giveaway.messageId}):`, err);
    }
}

function initGiveawayManager(client) {
    console.log('[SİSTEM] Çekiliş Yöneticisi (Giveaway Manager) başlatıldı.');

    setInterval(async () => {
        const now = Date.now();
        // Süresi dolmuş ve hala aktif olan çekilişleri bul
        const expiredGiveaways = stmts.getExpiredGiveaways.all(now, 'active');

        for (const giveaway of expiredGiveaways) {
            await processGiveaway(client, giveaway);
        }
    }, 15000); // Her 15 saniyede bir kontrol et
}

initGiveawayManager.processGiveaway = processGiveaway;
module.exports = initGiveawayManager;

