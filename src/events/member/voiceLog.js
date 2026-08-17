const { Events, EmbedBuilder } = require('discord.js');
const config = require('../../../config.json');
const embeds = require('../../utils/embeds');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const logChannelId = config.channels?.voiceLogChannel;
        if (!logChannelId) return;

        const logChannel = member.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        let desc = '';
        let title = '';
        let type = 'info';

        // Kanal Katılma
        if (!oldState.channelId && newState.channelId) {
            title = 'Sese Katıldı';
            desc = `**Kullanıcı:** <@${member.id}> (${member.user.tag})\n**Kanal:** <#${newState.channelId}> (\`${newState.channel.name}\`)`;
            type = 'success';
        }
        // Kanal Ayrılma
        else if (oldState.channelId && !newState.channelId) {
            title = 'Sesten Ayrıldı';
            desc = `**Kullanıcı:** <@${member.id}> (${member.user.tag})\n**Kanal:** <#${oldState.channelId}> (\`${oldState.channel.name}\`)`;
            type = 'error';
        }
        // Kanal Değiştirme
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            title = 'Ses Kanalı Değiştirdi';
            desc = `**Kullanıcı:** <@${member.id}> (${member.user.tag})\n**Eski Kanal:** <#${oldState.channelId}> (\`${oldState.channel.name}\`)\n**Yeni Kanal:** <#${newState.channelId}> (\`${newState.channel.name}\`)`;
            type = 'warn';
        }

        if (desc) {
            let embed;
            if (type === 'success') embed = embeds.logSuccess(desc, title);
            else if (type === 'error') embed = embeds.logError(desc, title);
            else embed = embeds.logWarn(desc, title);

            await logChannel.send(embed).catch(() => {});
        }
    }
};
