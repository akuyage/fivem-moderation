const { Events, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        if (!role.guild) return;
        const logChannelId = config.channels?.roleLogChannel;
        if (!logChannelId) return;

        const logChannel = role.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === role.id) {
                // Eğer ekip sistemi tarafından silinmişse log atma (zaten ekip komutu detaylı log atıyor)
                if (logEntry.reason && logEntry.reason.includes('Ekip')) return;

                if (logEntry.executor.id === role.client.user.id && logEntry.reason) {
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

        const desc = `
**Bir Rol Silindi!**

**Silinen Rol:** \`${role.name}\`
**Rol ID:** \`${role.id}\`
**Silen:** ${executor}
        `;

        await logChannel.send(embeds.logError(desc, 'Rol Silindi')).catch(() => {});
    }
};
