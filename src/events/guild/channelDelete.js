const { Events, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;
        const logChannelId = config.channels?.channelLogChannel;
        if (!logChannelId) return;

        const logChannel = channel.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === channel.id) {
                // Eğer ekip sistemi tarafından silinmişse log atma
                if (logEntry.reason && logEntry.reason.includes('Ekip')) return;

                if (logEntry.executor.id === channel.client.user.id && logEntry.reason) {
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
**Bir Kanal Silindi!**

**Silinen Kanal:** \`${channel.name}\`
**Kanal ID:** \`${channel.id}\`
**Silen:** ${executor}
        `;

        await logChannel.send(embeds.logError(desc, 'Kanal Silindi')).catch(() => {});
    }
};
