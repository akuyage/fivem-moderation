const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

async function fetchAuditLogWithRetry(guild, type, targetId, retries = 3, delay = 700) {
    for (let i = 0; i < retries; i++) {
        await new Promise(r => setTimeout(r, delay));
        try {
            const auditLogs = await guild.fetchAuditLogs({ limit: 6, type });
            const logEntry = auditLogs.entries.find(entry => 
                entry.target?.id === targetId && (Date.now() - entry.createdTimestamp < 20000)
            );
            if (logEntry) return logEntry;
        } catch (e) {
            // Hata olursa devam et
        }
    }
    return null;
}

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (!oldMember.guild) return;

        // Partial gelirse tam veriyi çek
        if (oldMember.partial) {
            try { await oldMember.fetch(); } catch { return; }
        }
        if (newMember.partial) {
            try { await newMember.fetch(); } catch { return; }
        }

        // --- NICKNAME DEĞİŞİMİ ---
        if (oldMember.nickname !== newMember.nickname) {
            const nameLogId = config.channels?.nameLogChannel;
            const nameLog = oldMember.guild.channels.cache.get(nameLogId);
            
            if (nameLog) {
                let executor = 'Bilinmiyor';
                try {
                    const logEntry = await fetchAuditLogWithRetry(oldMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
                    if (logEntry && logEntry.executor) {
                        executor = `<@${logEntry.executor.id}>`;
                    }
                } catch (e) {}

                const desc = `
**Kullanıcı:** <@${newMember.id}> (${newMember.user.tag})
**İşlem:** Nickname Değiştirildi
**Eski Nickname:** \`${oldMember.nickname || 'Yok'}\`
**Yeni Nickname:** \`${newMember.nickname || 'Yok'}\`
**Değiştiren:** ${executor}
                `;
                await nameLog.send(embeds.logWarn(desc, 'Nickname Değişimi')).catch(() => {});
            }
        }

        // --- ROL DEĞİŞİKLİKLERİ ---
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id) && role.id !== oldMember.guild.id);
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id) && role.id !== oldMember.guild.id);

        if (addedRoles.size > 0 || removedRoles.size > 0) {
            const roleLogId = config.channels?.roleLogChannel;
            const securityLogId = config.channels?.securityLogChannel;
            
            const roleLog = oldMember.guild.channels.cache.get(roleLogId);
            const securityLog = oldMember.guild.channels.cache.get(securityLogId);

            let executor = 'Bilinmiyor';
            try {
                const logEntry = await fetchAuditLogWithRetry(oldMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
                if (logEntry && logEntry.executor) {
                    if (logEntry.reason && logEntry.reason.includes('Ekip')) return;

                    if (logEntry.executor.id === newMember.client.user.id && logEntry.reason) {
                        const match = logEntry.reason.match(/Sorumlu: (.+?) \((\d+)\)/);
                        if (match) {
                            executor = `<@${match[2]}> (Bot aracılığıyla)`;
                        } else {
                            executor = `<@${logEntry.executor.id}> (Bot)`;
                        }
                    } else {
                        executor = `<@${logEntry.executor.id}>`;
                    }
                }
            } catch (e) {}

            let desc = `**Kullanıcı:** <@${newMember.id}> (${newMember.user.tag})\n**İşlem Yapan:** ${executor}\n\n`;

            if (addedRoles.size > 0) {
                desc += `**Eklenen Roller:**\n${addedRoles.map(r => `<@&${r.id}>`).join(', ')}`;
                
                // Güvenlik Kontrolü: Yönetici yetkisi içeren bir rol mü eklendi?
                const hasAdmin = addedRoles.some(r => r.permissions.has(PermissionFlagsBits.Administrator));
                if (hasAdmin && securityLog) {
                    const secDesc = `**KRİTİK UYARI!**\n\n<@${newMember.id}> kullanıcısına **YÖNETİCİ** yetkili bir rol verildi!\n\n**Verilen Roller:** ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}\n**Veren:** ${executor}`;
                    await securityLog.send(embeds.logError(secDesc, 'Kritik Yetki Ataması')).catch(() => {});
                }

                if (roleLog) {
                    await roleLog.send(embeds.logSuccess(desc, 'Kullanıcıya Rol Verildi')).catch(() => {});
                }
            } 
            
            if (removedRoles.size > 0) {
                let remDesc = `**Kullanıcı:** <@${newMember.id}> (${newMember.user.tag})\n**İşlem Yapan:** ${executor}\n\n`;
                remDesc += `**Alınan Roller:**\n${removedRoles.map(r => `<@&${r.id}>`).join(', ')}`;
                if (roleLog) {
                    await roleLog.send(embeds.logWarn(remDesc, 'Kullanıcıdan Rol Alındı')).catch(() => {});
                }
            }
        }
    }
};

