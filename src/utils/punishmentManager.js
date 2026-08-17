const db = require('../database/connect');
const config = require('../../config.json');
const { buildPunishContainer, sendPunishBroadcast } = require('./punishTemplate');

const stmts = {
    getExpired: db.prepare(`
        SELECT * FROM WLPunishments 
        WHERE expiresAt IS NOT NULL AND expiresAt <= ? AND active = 1 AND actionType = 'temp_ban'
    `),
    setInactive: db.prepare('UPDATE WLPunishments SET active = 0 WHERE id = ?')
};

module.exports = (client) => {
    // Her 1 dakikada bir süresi dolmuş cezaları kontrol et
    setInterval(async () => {
        const now = Date.now();
        
        // Aktif ve süresi dolmuş süreli cezaları çek
        const expiredPunishments = stmts.getExpired.all(now);

        for (const punish of expiredPunishments) {
            try {
                // Guild'i bul (process.env.GUILD_ID, config.guildId veya ilk önbellekteki sunucu)
                const guildId = process.env.GUILD_ID || config.guildId;
                const guild = (guildId ? client.guilds.cache.get(guildId) : null) 
                    || client.guilds.cache.first();
                if (!guild) continue;

                const member = await guild.members.fetch(punish.userId).catch(() => null);

                if (member) {
                    // Whitelist ve Karakter Onay rolünü geri ver
                    const wlRole = config.roles?.whitelist;
                    if (wlRole && guild.roles.cache.has(wlRole)) {
                        await member.roles.add(wlRole, `Uzaklaştırma cezası sona erdi (${punish.caseId})`).catch(() => null);
                    }
                    
                    const charApprovedRole = config.roles?.characterApproved;
                    if (charApprovedRole && guild.roles.cache.has(charApprovedRole)) {
                        await member.roles.add(charApprovedRole, `Uzaklaştırma cezası sona erdi (${punish.caseId})`).catch(() => null);
                    }

                    // Cezalı rolünü kaldır (mute rolü config.json'dan)
                    const punishRole = config.roles?.mute;
                    if (punishRole && member.roles.cache.has(punishRole)) {
                        await member.roles.remove(punishRole, `Uzaklaştırma cezası sona erdi (${punish.caseId})`).catch(() => null);
                    }
                }

                // DB'de pasif yap
                stmts.setInactive.run(punish.id);

                // "Uzaklaştırma Sona Erdi" Components V2 Bildirimi
                const targetUserObj = member ? member.user : { id: punish.userId, username: `Kullanıcı (${punish.userId})` };
                const options = {
                    actionType: 'unban',
                    caseId: punish.caseId,
                    guild,
                    targetUser: targetUserObj,
                    expiresAt: punish.expiresAt,
                    timestamp: now
                };

                // Hem bilgilendirme hem log kanalına gönder
                await sendPunishBroadcast(guild, options);

            } catch (error) {
                console.error('[Punish Manager] Süre sonu işleme hatası:', error);
            }
        }
    }, 60000); // 1 dakika
};

