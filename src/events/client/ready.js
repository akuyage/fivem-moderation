const { Events, REST, Routes } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[HAZIR] ${client.user.tag} olarak giriş yapıldı!`);

        const config = require('../../../config.json');

        // Bot Durumu (Oynuyor mesajı)
        if (config.botStatus) {
            client.user.setActivity(config.botStatus);
        }

        // Slash komutlarını Discord API'ye yükle
        if (client.commandsArray && client.commandsArray.length > 0) {
            const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
            try {
                console.log(`[API] (/) Komutları temizleniyor ve yeniden kaydediliyor...`);
                
                // Her durumda global komutları temizle (çakışmaları önlemek için)
                await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
                
                if (process.env.GUILD_ID) {
                    // Guild komutlarını yükle
                    await rest.put(
                        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
                        { body: client.commandsArray },
                    );
                    console.log('[API] (/) Komutları SUNUCUYA kaydedildi ve GLOBALLER temizlendi.');
                } else {
                    // Global komutları yeniden yükle
                    await rest.put(
                        Routes.applicationCommands(client.user.id),
                        { body: client.commandsArray },
                    );
                    console.log('[API] (/) Komutları KÜRESEL olarak kaydedildi.');
                }
            } catch (error) {
                console.error('[API HATA] Komutlar kaydedilemedi:', error);
            }
        }

        // Yetkili üyeleri önbelleğe al (Rate limitleri önlemek için)
        if (config.roles.staff) {
            client.guilds.cache.forEach(async (guild) => {
                try {
                    await guild.members.fetch({ role: config.roles.staff });
                    console.log(`[BELLEK] ${guild.name} için yetkililer önbelleğe alındı.`);
                } catch (err) {
                    console.error(`[BELLEK HATA] ${guild.name} yetkilileri alınamadı:`, err);
                }
            });
        }
        
        // Çekiliş yöneticisini başlat
        const initGiveawayManager = require('../../utils/giveawayManager');
        initGiveawayManager(client);

        // Günlük davet raporu görevini başlat
        const initDailyReport = require('../../utils/dailyReportTask');
        initDailyReport(client);

        // Whitelist ceza kontrol görevini başlat
        const initPunishmentManager = require('../../utils/punishmentManager');
        initPunishmentManager(client);

        // Sunucu davetlerini önbelleğe al (InviteTracker için)
        client.guilds.cache.forEach(async (guild) => {
            const invites = await guild.invites.fetch().catch(() => null);
            if (invites) {
                invites.forEach(invite => {
                    if (invite.inviterId) {
                        db.prepare('INSERT OR REPLACE INTO Invites (code, inviterId, uses) VALUES (?, ?, ?)')
                          .run(invite.code, invite.inviterId, invite.uses);
                    }
                });
                console.log(`[BELLEK] ${guild.name} için ${invites.size} davet kodu önbelleğe alındı.`);
            }
        });

        // Botun sürekli ses kanalında kalmasını sağla
        if (config.channels?.botVoiceChannel) {
            const { joinVoiceChannel } = require('@discordjs/voice');
            
            client.guilds.cache.forEach(guild => {
                const voiceChannel = guild.channels.cache.get(config.channels.botVoiceChannel);
                if (voiceChannel && voiceChannel.isVoiceBased()) {
                    try {
                        joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator,
                            selfDeaf: true,
                            selfMute: true
                        });
                        console.log(`[SES] Bot "${voiceChannel.name}" kanalına (Sağır ve Susturulmuş) olarak bağlandı.`);
                    } catch (error) {
                        console.error(`[SES HATA] ${voiceChannel.name} kanalına bağlanılamadı:`, error);
                    }
                }
            });
        }
    },
};
