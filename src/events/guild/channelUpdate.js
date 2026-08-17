const { Events, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!oldChannel.guild) return;
        if (oldChannel.name === newChannel.name) return;

        const logChannelId = config.channels?.channelLogChannel;
        if (!logChannelId) return;

        const logChannel = oldChannel.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await oldChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === newChannel.id) {
                if (logEntry.executor.id === newChannel.client.user.id && logEntry.reason) {
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
**Bir Kanal Güncellendi!**

**Kanal:** <#${newChannel.id}>
**Eski İsim:** \`${oldChannel.name}\`
**Yeni İsim:** \`${newChannel.name}\`
**Güncelleyen:** ${executor}
        `;

        await logChannel.send(embeds.logWarn(desc, 'Kanal Güncellendi')).catch(() => {});
    }
};
