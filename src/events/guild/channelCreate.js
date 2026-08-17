const { Events, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;
        const logChannelId = config.channels?.channelLogChannel;
        if (!logChannelId) return;

        const logChannel = channel.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        let realUser = null;
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === channel.id) {
                // Eğer ekip sistemi tarafından oluşturulmuşsa log atma
                if (logEntry.reason && logEntry.reason.includes('Ekip')) return;

                // Eğer işlemi yapan bot ise, reason'dan gerçek sorumluyu çek
                if (logEntry.executor.id === channel.client.user.id && logEntry.reason) {
                    const match = logEntry.reason.match(/Sorumlu: (.+?) \((\d+)\)/);
                    if (match) {
                        realUser = match[2];
                        executor = `<@${realUser}> (Bot aracılığıyla)`;
                    } else {
                        executor = `<@${logEntry.executor.id}> (Bot)`;
                    }
                } else {
                    executor = `<@${logEntry.executor.id}>`;
                }
            }
        } catch (e) {}

        const desc = `
**Yeni Bir Kanal Oluşturuldu!**

**Kanal:** <#${channel.id}> (\`${channel.name}\`)
**Kanal ID:** \`${channel.id}\`
**Oluşturan:** ${executor}
        `;

        await logChannel.send(embeds.logSuccess(desc, 'Kanal Oluşturuldu')).catch(() => {});
    }
};
