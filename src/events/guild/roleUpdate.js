const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        if (!oldRole.guild) return;
        if (oldRole.name === newRole.name && oldRole.permissions.bitfield === newRole.permissions.bitfield) return;

        const logChannelId = config.channels?.roleLogChannel;
        if (!logChannelId) return;

        const logChannel = oldRole.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let executor = 'Bilinmiyor';
        
        try {
            await new Promise(r => setTimeout(r, 500));
            const auditLogs = await oldRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
            const logEntry = auditLogs.entries.first();
            if (logEntry && logEntry.target.id === newRole.id) {
                if (logEntry.executor.id === newRole.client.user.id && logEntry.reason) {
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

        let desc = `**Bir Rol Güncellendi!**\n\n**Rol:** <@&${newRole.id}>\n**Güncelleyen:** ${executor}\n\n`;

        if (oldRole.name !== newRole.name) {
            desc += `**İsim Değişimi:**\n\`${oldRole.name}\` ➔ \`${newRole.name}\`\n`;
        }

        const oldAdmin = oldRole.permissions.has(PermissionFlagsBits.Administrator);
        const newAdmin = newRole.permissions.has(PermissionFlagsBits.Administrator);

        if (!oldAdmin && newAdmin) {
            desc += `\n**DİKKAT!** Bu role **YÖNETİCİ** yetkisi eklendi!`;
            
            const securityLogId = config.channels?.securityLogChannel;
            const securityLog = oldRole.guild.channels.cache.get(securityLogId);
            
            if (securityLog) {
                await securityLog.send(embeds.logError(desc, 'Kritik Rol Güncellemesi')).catch(() => {});
            }
            await logChannel.send(embeds.logError(desc, 'Kritik Rol Güncellemesi')).catch(() => {});
            return;
        }

        await logChannel.send(embeds.logWarn(desc, 'Rol Güncellendi')).catch(() => {});
    }
};
