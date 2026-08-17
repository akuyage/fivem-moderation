const { Events } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (oldMessage.partial) return;
        if (!oldMessage.guild || !oldMessage.author || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return; // Yalnızca embed eklenmesi gibi durumları yoksay

        const logChannelId = config.channels?.messageLogChannel;
        if (!logChannelId) return;

        const logChannel = oldMessage.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const desc = `
**Bir Mesaj Düzenlendi!**
        
**Gönderen:** <@${oldMessage.author.id}> (${oldMessage.author.tag})
**Kanal:** <#${oldMessage.channel.id}>

**Eski İçerik:**
\`\`\`text
${oldMessage.content || '[İçerik Yok]'}
\`\`\`
**Yeni İçerik:**
\`\`\`text
${newMessage.content || '[İçerik Yok]'}
\`\`\`
[Mesaja Git](${newMessage.url})
        `;

        await logChannel.send(embeds.logWarn(desc, 'Mesaj Düzenlendi')).catch(() => {});
    }
};
