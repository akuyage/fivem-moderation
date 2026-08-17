const config = require('../../config.json');

const parseColor = (hex) => parseInt(hex.replace('#', ''), 16);

const buildPayload = (colorHex, title, description, serverName, isLog) => {
    const containerComponents = [];
    
    if (!isLog && serverName) {
        containerComponents.push({
            type: 10,
            content: `### ${serverName} | ${title}`
        });
        containerComponents.push({ type: 14 });
    } else {
        containerComponents.push({
            type: 10,
            content: `### ${title}`
        });
        containerComponents.push({ type: 14 });
    }

    containerComponents.push({
        type: 10,
        content: description
    });

    containerComponents.push({ type: 14 });

    containerComponents.push({
        type: 10,
        content: `-# Powered By akuyage`
    });

    return {
        flags: (1 << 15),
        components: [
            {
                type: 17,
                accent_color: parseColor(colorHex),
                components: containerComponents
            }
        ]
    };
};

module.exports = {
    // Normal mesajlar (üstte sunucu adı, altta powered by)
    success: (guildName, description, title = 'Başarılı') => buildPayload(config.embed.successColor || '#43b581', title, description, guildName, false),
    error: (guildName, description, title = 'Hata') => buildPayload(config.embed.errorColor || '#f04747', title, description, guildName, false),
    warn: (guildName, description, title = 'Uyarı') => buildPayload(config.embed.warningColor || '#faa61a', title, description, guildName, false),
    info: (guildName, description, title = 'Bilgi') => buildPayload(config.embed.color || '#2f3136', title, description, guildName, false),
    
    // Log mesajları (üstte sunucu adı YOK, altta powered by VAR)
    logSuccess: (description, title = 'Başarılı') => buildPayload(config.embed.successColor || '#43b581', title, description, null, true),
    logError: (description, title = 'Hata') => buildPayload(config.embed.errorColor || '#f04747', title, description, null, true),
    logWarn: (description, title = 'Uyarı') => buildPayload(config.embed.warningColor || '#faa61a', title, description, null, true),
    logInfo: (description, title = 'Bilgi') => buildPayload(config.embed.color || '#2f3136', title, description, null, true),
};
