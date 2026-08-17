const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { generateCaseId, buildPunishContainer, sendPunishBroadcast, formatMsToText } = require('../../utils/punishTemplate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-uyari')
        .setDescription('Kullanıcıya yazılı whitelist uyarısı verir.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Uyarı verilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('kural')
                .setDescription('İhlal edilen kural (Örn: 2.1.12 Basit rol kuralları)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Uyarı sebebi / detaylı açıklama')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Staff rolü kontrolü
        const staffRoleId = config.roles?.staff;
        const isStaff = staffRoleId && interaction.member.roles.cache.has(staffRoleId);
        
        // Admin veya Staff rolü gerekli
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !isStaff) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu komutu kullanmak için Üye Yönet yetkisine veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const target = interaction.options.getMember('kullanici');
        const rule = interaction.options.getString('kural');
        const reason = interaction.options.getString('sebep');

        if (!target) {
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı sunucuda bulunamadı.'));
        }

        const guild = interaction.guild;
        const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);

        // Uyarı Rollerini Tespit Et / Getir
        const warnRoleRows = db.prepare('SELECT * FROM WLWarningRoles').all();
        let role1Id = warnRoleRows.find(r => r.level === 1)?.roleId || guildConfig?.wlWarning1RoleId;
        let role2Id = warnRoleRows.find(r => r.level === 2)?.roleId || guildConfig?.wlWarning2RoleId;

        // Otomatik rol oluşturma (rol yoksa)
        if (!role1Id || !guild.roles.cache.has(role1Id)) {
            let r1 = guild.roles.cache.find(r => r.name === 'Uyarı Puanı - I');
            if (!r1) {
                r1 = await guild.roles.create({ name: 'Uyarı Puanı - I', color: 0xfaa61a, reason: 'Otomatik Uyarı Rolü' });
            }
            role1Id = r1.id;
            db.prepare('INSERT OR REPLACE INTO WLWarningRoles (level, roleId) VALUES (1, ?)').run(role1Id);
        }

        if (!role2Id || !guild.roles.cache.has(role2Id)) {
            let r2 = guild.roles.cache.find(r => r.name === 'Uyarı Puanı - II');
            if (!r2) {
                r2 = await guild.roles.create({ name: 'Uyarı Puanı - II', color: 0xf04747, reason: 'Otomatik Uyarı Rolü' });
            }
            role2Id = r2.id;
            db.prepare('INSERT OR REPLACE INTO WLWarningRoles (level, roleId) VALUES (2, ?)').run(role2Id);
        }

        // Kullanıcının Mevcut Uyarı Puanını Belirle
        let currentLevel = 0;
        if (target.roles.cache.has(role2Id)) {
            currentLevel = 2;
        } else if (target.roles.cache.has(role1Id)) {
            currentLevel = 1;
        }

        const newLevel = currentLevel + 1;
        const caseId = generateCaseId();
        const now = Date.now();

        // ==========================================
        // SENARYO A: 1. veya 2. Uyarı (Rol Ata)
        // ==========================================
        if (newLevel <= 2) {
            const warningLevelStr = newLevel === 1 ? 'I' : 'II';

            // Rolleri ata (2. uyarıda 1. uyarı rolü de kalır)
            if (newLevel === 1) {
                await target.roles.add(role1Id, `Uyarı Puanı - I (${caseId})`).catch(() => null);
            } else if (newLevel === 2) {
                if (!target.roles.cache.has(role1Id)) {
                    await target.roles.add(role1Id, `Uyarı Puanı - I (${caseId})`).catch(() => null);
                }
                await target.roles.add(role2Id, `Uyarı Puanı - II (${caseId})`).catch(() => null);
            }

            // DB'ye Kaydet
            db.prepare(`
                INSERT INTO WLPunishments (caseId, userId, staffId, actionType, warningLevel, rule, reason, timestamp)
                VALUES (?, ?, ?, 'warn', ?, ?, ?, ?)
            `).run(caseId, target.id, interaction.user.id, warningLevelStr, rule, reason, now);

            // Container Mesajını Oluştur
            const options = {
                actionType: 'warn',
                caseId,
                guild,
                targetUser: target.user,
                staffUser: interaction.user,
                warningLevel: warningLevelStr,
                rule,
                reason,
                timestamp: now
            };

            // Bilgilendirme ve Log Kanallarına Gönder
            await sendPunishBroadcast(guild, options);

            return interaction.editReply({
                ...embeds.success(guild.name, `**${target.user.username}** kullanıcısına **Uyarı Puanı - ${warningLevelStr}** verildi.\n> **Case ID:** \`${caseId}\``)
            });
        }

        // ==========================================
        // SENARYO B: 3. Uyarı (Otomatik Ceza Modu)
        // ==========================================
        const autoType = config.autoPunish?.type || guildConfig?.autoPunishType || 'temp_ban'; // 'temp_ban' veya 'perma_ban'
        const autoDurationMs = config.autoPunish?.duration || guildConfig?.autoPunishDuration || (3 * 24 * 60 * 60 * 1000); // 3 gün varsayılan
        const autoDurationText = formatMsToText(autoDurationMs);
        const expiresAt = autoType === 'temp_ban' ? (now + autoDurationMs) : null;

        // Uyarı rollerini temizle
        if (target.roles.cache.has(role1Id)) await target.roles.remove(role1Id).catch(() => null);
        if (target.roles.cache.has(role2Id)) await target.roles.remove(role2Id).catch(() => null);

        // Whitelist ve Karakter Onay rolünü al
        const wlRoleId = config.roles?.whitelist;
        if (wlRoleId && target.roles.cache.has(wlRoleId)) {
            await target.roles.remove(wlRoleId, `3. Uyarı Sınırı Aşıldı (${caseId})`).catch(() => null);
        }
        const charApprovedRoleId = config.roles?.characterApproved;
        if (charApprovedRoleId && target.roles.cache.has(charApprovedRoleId)) {
            await target.roles.remove(charApprovedRoleId, `3. Uyarı Sınırı Aşıldı (${caseId})`).catch(() => null);
        }

        // Cezalı rolünü ver
        const punishRoleId = guildConfig?.wlPunishRoleId || config.roles?.mute;
        if (punishRoleId && guild.roles.cache.has(punishRoleId)) {
            await target.roles.add(punishRoleId, `3. Uyarı Sınırı Aşıldı (${caseId})`).catch(() => null);
        }

        // Kalıcı uzaklaştırmada Discord'dan da banla
        if (autoType === 'perma_ban') {
            await target.ban({ reason: `3. Uyarı Sınırı Aşıldı (${caseId}) - ${rule}: ${reason}` }).catch(err => console.error('[WL-Uyari] Discord ban hatası:', err));
        }

        // Kullanıcının önceki tüm aktif uyarılarını DB'de pasife çek
        db.prepare(`
            UPDATE WLPunishments SET active = 0 
            WHERE userId = ? AND actionType = 'warn' AND active = 1
        `).run(target.id);

        // DB'ye Kaydet
        db.prepare(`
            INSERT INTO WLPunishments (caseId, userId, staffId, actionType, rule, reason, duration, durationText, expiresAt, timestamp, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
            caseId,
            target.id,
            interaction.user.id,
            autoType,
            rule,
            `3. Uyarı Sınırı Aşıldı: ${reason}`,
            autoType === 'temp_ban' ? autoDurationMs : null,
            autoType === 'temp_ban' ? autoDurationText : 'Kalıcı',
            expiresAt,
            now
        );

        const options = {
            actionType: autoType,
            caseId,
            guild,
            targetUser: target.user,
            staffUser: interaction.user,
            rule,
            reason: `3. Uyarı Sınırı Aşıldı: ${reason}`,
            durationText: autoType === 'temp_ban' ? autoDurationText : 'Kalıcı',
            expiresAt,
            timestamp: now
        };

        // Bilgilendirme ve Log Kanallarına Gönder
        await sendPunishBroadcast(guild, options);

        return interaction.editReply({
            ...embeds.warn(
                guild.name,
                `**${target.user.username}** 3. uyarısına ulaştığı için **${autoType === 'temp_ban' ? `${autoDurationText} Süreli Uzaklaştırma` : 'Kalıcı Uzaklaştırma'}** uygulandı.\n> **Case ID:** \`${caseId}\``
            )
        });
    }
};
