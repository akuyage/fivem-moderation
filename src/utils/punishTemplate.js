const db = require('../database/connect');

/**
 * Benzersiz AKY-XXXXX (5 haneli) Case ID üretir
 */
function generateCaseId() {
    let caseId;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 100) {
        const randomNum = Math.floor(10000 + Math.random() * 90000); // 10000 - 99999
        caseId = `AKY-${randomNum}`;
        const row = db.prepare('SELECT id FROM WLPunishments WHERE caseId = ?').get(caseId);
        if (!row) {
            exists = false;
        }
        attempts++;
    }

    return caseId;
}

/**
 * GG.AA.YYYY SS:DD Türkçe Tarih Formatı
 */
function formatDateTR(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return 'Bilinmiyor';

    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Süre metnini (3d, 12h, 30m, 3 gün vb.) milisaniyeye çevirir
 */
function parseDuration(durationStr) {
    if (!durationStr) return null;
    const str = String(durationStr).trim().toLowerCase();

    // Sayı ve birim yakala
    const match = str.match(/^(\d+)\s*([a-zğüşıöç]+)?$/i);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2] || 'h';

    let multiplier = 60 * 60 * 1000; // Varsayılan saat
    if (unit.startsWith('m') || unit === 'dk' || unit === 'dakika') multiplier = 60 * 1000;
    else if (unit.startsWith('h') || unit === 's' || unit === 'saat') multiplier = 60 * 60 * 1000;
    else if (unit.startsWith('d') || unit === 'g' || unit === 'gün' || unit === 'gun') multiplier = 24 * 60 * 60 * 1000;
    else if (unit.startsWith('w') || unit === 'hafta') multiplier = 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('mo') || unit === 'ay') multiplier = 30 * 24 * 60 * 60 * 1000;

    return {
        ms: amount * multiplier,
        formatted: `${amount} ${unit.startsWith('d') || unit.startsWith('g') ? 'gün' : unit.startsWith('m') && !unit.startsWith('mo') ? 'dakika' : unit.startsWith('w') ? 'hafta' : unit.startsWith('mo') ? 'ay' : 'saat'}`
    };
}

function formatMsToText(ms) {
    if (!ms) return 'Bilinmiyor';
    if (ms >= 30 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (30 * 24 * 60 * 60 * 1000))} ay`;
    if (ms >= 7 * 24 * 60 * 60 * 1000) return `${Math.round(ms / (7 * 24 * 60 * 60 * 1000))} hafta`;
    if (ms >= 24 * 60 * 60 * 1000) return `${Math.round(ms / (24 * 60 * 60 * 1000))} gün`;
    if (ms >= 60 * 60 * 1000) return `${Math.round(ms / (60 * 60 * 1000))} saat`;
    if (ms >= 60 * 1000) return `${Math.round(ms / (60 * 1000))} dakika`;
    return `${Math.round(ms / 1000)} saniye`;
}

/**
 * Components V2 Ceza / Uyarı Container Oluşturucu
 * 
 * @param {Object} options
 * @param {'warn'|'temp_ban'|'perma_ban'|'unban'} options.actionType
 * @param {string} options.caseId
 * @param {import('discord.js').Guild} options.guild
 * @param {import('discord.js').User|import('discord.js').GuildMember} options.targetUser
 * @param {import('discord.js').User|import('discord.js').GuildMember} [options.staffUser]
 * @param {string} [options.warningLevel] - 'I' veya 'II'
 * @param {string} [options.rule]
 * @param {string} [options.reason]
 * @param {string} [options.durationText]
 * @param {number|Date} [options.expiresAt]
 * @param {number|Date} [options.timestamp]
 */
function buildPunishContainer({
    actionType,
    caseId,
    guild,
    targetUser,
    staffUser,
    warningLevel,
    rule,
    reason,
    durationText,
    expiresAt,
    timestamp = Date.now()
}) {
    const targetId = targetUser?.id || targetUser;
    const targetTag = targetUser?.username || targetUser?.tag || `<@${targetId}>`;
    const staffId = staffUser?.id || staffUser;
    const staffTag = staffUser ? (staffUser.username || staffUser.tag || `<@${staffId}>`) : null;
    const guildIcon = guild?.iconURL({ dynamic: true }) || '';
    const dateFormatted = formatDateTR(timestamp);

    let title = '';
    let accentColor = 0x2b2d31;

    switch (actionType) {
        case 'warn':
            title = '👤 Uyarı';
            accentColor = 0xfaa61a; // Sarı / Turuncu
            break;
        case 'temp_ban':
            title = '👤 Süreli Uzaklaştırma';
            accentColor = 0xf04747; // Kırmızı
            break;
        case 'perma_ban':
            title = '👤 Kalıcı Uzaklaştırma';
            accentColor = 0x202225; // Koyu / Siyah
            break;
        case 'unban':
            title = '✅ Uzaklaştırma Sona Erdi';
            accentColor = 0x43b581; // Yeşil
            break;
        case 'warn_remove':
            title = '✅ Uyarı Kaldırıldı';
            accentColor = 0x43b581; // Yeşil
            break;
    }

    const containerComponents = [];

    // 1. Üst Kısım (Başlık + Case ID solda, Sunucu ikonu sağda)
    let headerSubtitle = caseId;
    if (actionType === 'warn' && warningLevel) {
        headerSubtitle = `${caseId} • Uyarı Puanı: ${warningLevel}`;
    } else if (actionType === 'warn_remove' && warningLevel) {
        headerSubtitle = `${caseId} • Kaldırılan: Uyarı Puanı - ${warningLevel}`;
    }

    containerComponents.push({
        type: 9, // Section
        components: [
            {
                type: 10, // TextDisplay
                content: `### ${title}\n-# ${headerSubtitle}`
            }
        ],
        accessory: guildIcon ? {
            type: 11, // Thumbnail
            media: { url: guildIcon }
        } : undefined
    });

    containerComponents.push({ type: 14 }); // Separator

    // 2. Bilgi Satırları
    if (actionType === 'unban') {
        const expiresFormatted = expiresAt ? formatDateTR(expiresAt) : dateFormatted;
        const moderatorInfo = staffId ? `**Yetkili:** <@${staffId}>\n` : '';
        containerComponents.push({
            type: 10,
            content: `${moderatorInfo}**Kullanıcı:** <@${targetId}>\n**İşlem Kodu:** ${caseId}\n**İşlem Tarihi:** ${dateFormatted}\n**Bitiş:** ${expiresFormatted}`
        });
    } else {
        const moderatorInfo = staffId ? `**Yetkili:** <@${staffId}>\n` : '';
        let details = `${moderatorInfo}**Kullanıcı:** <@${targetId}>\n**İşlem Kodu:** ${caseId}\n**İşlem Tarihi:** ${dateFormatted}`;

        if (actionType === 'temp_ban') {
            if (durationText) details += `\n**Süre:** ${durationText}`;
            if (expiresAt) details += `\n**Bitiş:** ${formatDateTR(expiresAt)}`;
        }

        containerComponents.push({
            type: 10,
            content: details
        });

        // 3. Kural ve Sebep
        if (rule || reason) {
            containerComponents.push({ type: 14 }); // Separator
            let ruleReason = '';
            if (rule) ruleReason += `**Kural:** ${rule}\n`;
            if (reason) ruleReason += `**Sebep:** ${reason}`;
            containerComponents.push({
                type: 10,
                content: ruleReason.trim()
            });
        }
    }

    // 3. Footer
    containerComponents.push({ type: 14 });
    containerComponents.push({
        type: 10,
        content: `-# Powered by akuyage`
    });

    return {
        flags: (1 << 15), // IS_COMPONENTS_V2
        components: [
            {
                type: 17, // Container
                accent_color: accentColor,
                components: containerComponents
            }
        ]
    };
}

/**
 * Hem Ceza Bilgilendirme Kanalına hem de Ceza Log Kanalına gönderim yapar
 */
async function sendPunishBroadcast(guild, options) {
    const config = require('../../config.json');
    let guildConfig = null;
    try {
        guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);
    } catch (e) {}

    const announceChannelId = config.channels?.wlAnnounceChannel || config.channels?.cezaBilgilendirme || guildConfig?.wlAnnounceChannelId;
    const logChannelId = config.channels?.whitelistPunishLog || config.channels?.warningLogChannel;

    // 1. Bilgilendirme Kanalına Gönder
    let announceChannel = null;
    if (announceChannelId) {
        announceChannel = guild.channels.cache.get(announceChannelId) 
            || await guild.channels.fetch(announceChannelId).catch(() => null);
    }
    // Eğer ID ile bulunamazsa kanal ismiyle ara
    if (!announceChannel) {
        announceChannel = guild.channels.cache.find(c => c.name === 'ceza-bilgilendirme' || c.name === 'wl-bilgilendirme' || c.name === 'wl-duyuru');
    }

    if (announceChannel) {
        try {
            const payload = buildPunishContainer(options);
            await announceChannel.send(payload);
        } catch (err) {
            console.error('[Punish Broadcast] Bilgilendirme kanalına gönderilemedi:', err);
        }
    } else {
        console.warn('[Punish Broadcast] ceza-bilgilendirme kanalı sunucuda bulunamadı.');
    }

    // 2. Log Kanalına Gönder (Farklı bir kanalsa)
    let logChannel = null;
    if (logChannelId && (!announceChannel || logChannelId !== announceChannel.id)) {
        logChannel = guild.channels.cache.get(logChannelId)
            || await guild.channels.fetch(logChannelId).catch(() => null);
    }
    // Log kanalı ID ile bulunamazsa veya announce ile aynı değilse isimle ara
    if (!logChannel && (!announceChannel || announceChannel.name !== 'whitelist-ceza-log')) {
        logChannel = guild.channels.cache.find(c => c.name === 'whitelist-ceza-log' || c.name === 'ceza-log');
    }

    if (logChannel && (!announceChannel || logChannel.id !== announceChannel.id)) {
        const { EmbedBuilder } = require('discord.js');
        const { actionType, caseId, targetUser, staffUser, warningLevel, rule, reason, durationText, expiresAt, timestamp } = options;
        
        let logTitle = '';
        let logColor = 0x2b2d31;
        switch (actionType) {
            case 'warn': logTitle = 'Uyarı'; logColor = 0xfaa61a; break;
            case 'temp_ban': logTitle = 'Süreli Uzaklaştırma'; logColor = 0xf04747; break;
            case 'perma_ban': logTitle = 'Kalıcı Uzaklaştırma'; logColor = 0x202225; break;
            case 'unban': logTitle = 'Uzaklaştırma Sona Erdi'; logColor = 0x43b581; break;
            case 'warn_remove': logTitle = 'Uyarı Kaldırıldı'; logColor = 0x43b581; break;
        }

        const logEmbed = new EmbedBuilder()
            .setTitle(`Whitelist İşlemi: ${logTitle}`)
            .setColor(logColor)
            .addFields(
                { name: 'Kullanıcı', value: `<@${targetUser.id || targetUser}>`, inline: true }
            );

        if (staffUser) logEmbed.addFields({ name: 'Yetkili', value: `<@${staffUser.id || staffUser}>`, inline: true });
        logEmbed.addFields({ name: 'Case ID', value: `\`${caseId}\``, inline: true });

        if (actionType === 'warn' && warningLevel) logEmbed.addFields({ name: 'Uyarı Puanı', value: warningLevel, inline: true });
        if (actionType === 'temp_ban') {
            if (durationText) logEmbed.addFields({ name: 'Süre', value: durationText, inline: true });
            if (expiresAt) logEmbed.addFields({ name: 'Bitiş', value: formatDateTR(expiresAt), inline: true });
        }
        if (rule) logEmbed.addFields({ name: 'Kural', value: rule, inline: false });
        if (reason) logEmbed.addFields({ name: 'Sebep', value: reason, inline: false });

        try {
            await logChannel.send({ embeds: [logEmbed] });
        } catch (err) {
            console.error('[Punish Broadcast] Log kanalına gönderilemedi:', err);
        }
    }
}


module.exports = {
    generateCaseId,
    formatDateTR,
    parseDuration,
    formatMsToText,
    buildPunishContainer,
    sendPunishBroadcast
};
