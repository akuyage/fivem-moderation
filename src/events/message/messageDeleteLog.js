const { Events } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (message.partial) return; // Kısmi mesajları loglayamayız
        if (!message.guild || !message.author || message.author.bot) return;

        const logChannelId = config.channels?.messageLogChannel;
        if (!logChannelId) return;

        // IC isim kanalındaki silinmeleri loglama
        if (message.channel.id === config.channels?.icName) return;

        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const desc = `
**Bir Mesaj Silindi!**
        
**Gönderen:** <@${message.author.id}> (${message.author.tag})
**Kanal:** <#${message.channel.id}>

**İçerik:**
\`\`\`text
${message.content || '[İçerik Yok / Sadece Medya]'}
\`\`\`
        `;

        await logChannel.send(embeds.logError(desc, 'Mesaj Silindi')).catch(() => {});
    }
};
