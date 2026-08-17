const { Events, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        if (!role.guild) return;
        const logChannelId = config.channels?.roleLogChannel;
        if (!logChannelId) return;

        const logChannel = role.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleCreate });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === role.id) {
                // Eğer ekip sistemi tarafından oluşturulmuşsa log atma (zaten ekip komutu daha detaylısını atıyor)
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
**Yeni Bir Rol Oluşturuldu!**

**Rol:** <@&${role.id}> (\`${role.name}\`)
**Rol ID:** \`${role.id}\`
**Renk:** \`${role.hexColor}\`
**Oluşturan:** ${executor}
        `;

        await logChannel.send(embeds.logSuccess(desc, 'Rol Oluşturuldu')).catch(() => {});
    }
};
