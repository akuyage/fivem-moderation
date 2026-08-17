const { Events } = require('discord.js');
const db = require('../../database/connect');
const config = require('../../../config.json');

const stmts = {
    getAllInvites: db.prepare('SELECT * FROM Invites'),
    getInviteByCode: db.prepare('SELECT * FROM Invites WHERE code = ?'),
    upsertInvite: db.prepare('INSERT OR REPLACE INTO Invites (code, inviterId, uses) VALUES (?, ?, ?)'),
    insertJoinLog: db.prepare(`
        INSERT INTO JoinLogs (userId, inviterId, inviteCode, securityLevel, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `),
    insertStaffStatsIgnore: db.prepare('INSERT OR IGNORE INTO InviteStats (userId) VALUES (?)'),
    updateInviteStats: db.prepare('UPDATE InviteStats SET total = total + 1, regular = regular + 1 WHERE userId = ?')
};

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        const unregisteredRoleId = config.roles.unregistered;

        if (unregisteredRoleId && unregisteredRoleId !== 'ROLE_ID_HERE') {
            try {
                const role = member.guild.roles.cache.get(unregisteredRoleId);
                if (role) {
                    await member.roles.add(role);
                    console.log(`[Otorol] ${member.user.username} kullanıcısına otomatik rol verildi.`);
                }
            } catch (err) {
                console.error(`[Otorol] Rol verilirken hata oluştu (${member.user.username}):`, err);
            }
        }

        // Davetleri karşılaştır ve davet edeni bul
        const newInvites = await member.guild.invites.fetch().catch(() => null);
        const oldInvites = stmts.getAllInvites.all();
        
        let usedInvite = null;
        let isVanity = false;

        // 1. Standart Davetleri Kontrol Et
        if (newInvites) {
            for (const invite of newInvites.values()) {
                const oldInv = oldInvites.find(i => i.code === invite.code);
                if ((!oldInv && invite.uses > 0) || (oldInv && invite.uses > oldInv.uses)) {
                    usedInvite = invite;
                    break;
                }
            }
            // Kayıtları güncelle
            for (const invite of newInvites.values()) {
                if (invite.inviterId) {
                    stmts.upsertInvite.run(invite.code, invite.inviterId, invite.uses);
                }
            }
        }

        // 2. Vanity (Özel Sunucu URL) Kontrolü
        if (!usedInvite && member.guild.vanityURLCode) {
            try {
                const vanityData = await member.guild.fetchVanityData().catch(() => null);
                if (vanityData) {
                    const oldVanity = stmts.getInviteByCode.get(member.guild.vanityURLCode);
                    if (oldVanity && vanityData.uses > oldVanity.uses) {
                        isVanity = true;
                        usedInvite = {
                            code: member.guild.vanityURLCode,
                            inviterId: 'VANITY_URL',
                            url: `https://discord.gg/${member.guild.vanityURLCode}`
                        };
                    }
                    // Vanity kullanımını kaydet
                    stmts.upsertInvite.run(member.guild.vanityURLCode, 'VANITY_URL', vanityData.uses);
                }
            } catch (vErr) {}
        }

        // Güvenlik Seviyesi Hesapla
        const ageInDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        let securityLevel = 'Güvenli';
        let accentColor = 0x43b581; // Yeşil

        if (ageInDays < 7) {
            securityLevel = 'Güvenli Değil';
            accentColor = 0xf04747; // Kırmızı
        } else if (ageInDays < 30) {
            securityLevel = 'Şüpheli';
            accentColor = 0xfaa61a; // Sarı
        }

        const inviterDbId = usedInvite ? usedInvite.inviterId : 'Bilinmiyor / OAuth2';
        const inviteCodeDb = usedInvite ? usedInvite.code : 'Bilinmiyor';

        // Veritabanına Logla
        stmts.insertJoinLog.run(member.id, inviterDbId, inviteCodeDb, securityLevel, Date.now());

        // Invite Stats Güncelle (Sadece gerçek kullanıcı davetlerinde)
        if (usedInvite && usedInvite.inviterId && usedInvite.inviterId !== 'VANITY_URL' && !usedInvite.inviterId.includes('Bilinmiyor')) {
            stmts.insertStaffStatsIgnore.run(usedInvite.inviterId);
            stmts.updateInviteStats.run(usedInvite.inviterId);
        }

        // Davet Eden / Kod Formatı
        let inviterDisplay = 'Bilinmiyor / OAuth2';
        let inviteCodeDisplay = 'Bilinmiyor';

        if (usedInvite) {
            if (usedInvite.inviterId === 'VANITY_URL' || isVanity) {
                inviterDisplay = 'Özel Davet Linki (Vanity URL)';
                inviteCodeDisplay = `\`${usedInvite.code}\` (Özel URL)`;
            } else if (usedInvite.inviterId) {
                inviterDisplay = `<@${usedInvite.inviterId}>`;
                inviteCodeDisplay = `\`${usedInvite.code}\``;
            }
        }

        // Üye Giriş Logu
        const joinedLogChannel = member.guild.channels.cache.get(config.channels?.joinedLogChannel);
        if (joinedLogChannel) {
            const avatar = member.user.displayAvatarURL({ dynamic: true });
            
            const containerComponents = [
                {
                    type: 9,
                    components: [
                        {
                            type: 10,
                            content: `# Sunucuya Katıldı\n${member.user.username} az önce sunucuya katıldı.`
                        }
                    ],
                    accessory: {
                        type: 11,
                        media: { url: avatar }
                    }
                },
                { type: 14 },
                {
                    type: 10,
                    content: `### Kullanıcı Bilgileri\n> **Kullanıcı:** <@${member.id}> (\`${member.id}\`)\n> **Davet Eden:** ${inviterDisplay}\n> **Davet Kodu:** ${inviteCodeDisplay}`
                },
                { type: 14 },
                {
                    type: 10,
                    content: `### Güvenlik Analizi\n> **Hesap Tarihi:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n> **Güvenlik Durumu:** \`${securityLevel}\``
                },
                { type: 14 },
                {
                    type: 10,
                    content: `-# Powered By akuyage`
                }
            ];

            await joinedLogChannel.send({
                flags: (1 << 15),
                components: [{ type: 17, accent_color: accentColor, components: containerComponents }]
            }).catch(() => {});
        }

        // --- Daily Invite Log (config.json tabanlı) ---
        const dailyInviteLogChannelId = config.channels?.inviteReportLog;
        if (dailyInviteLogChannelId) {
            const dailyLogChannel = member.guild.channels.cache.get(dailyInviteLogChannelId)
                || await member.guild.channels.fetch(dailyInviteLogChannelId).catch(() => null);

            if (dailyLogChannel) {
                const msg = usedInvite
                    ? `✅ **${member.user.tag}** sunucuya katıldı.\nKullanılan davet: ${inviteCodeDisplay} • <${usedInvite.url || `https://discord.gg/${usedInvite.code}`}>\nDavet sahibi: ${inviterDisplay}`
                    : `✅ **${member.user.tag}** sunucuya katıldı. (Kullanılan davet algılanamadı / OAuth2)`;

                dailyLogChannel.send({ content: msg }).catch(() => {});
            }
        }
    }
};

