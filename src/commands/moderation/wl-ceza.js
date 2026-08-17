const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { generateCaseId, parseDuration, buildPunishContainer, sendPunishBroadcast } = require('../../utils/punishTemplate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-ceza')
        .setDescription('Kullanıcıya doğrudan whitelist cezası (süreli veya kalıcı) verir.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Cezalandırılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tip')
                .setDescription('Ceza tipi')
                .setRequired(true)
                .addChoices(
                    { name: 'Süreli Uzaklaştırma', value: 'temp_ban' },
                    { name: 'Kalıcı Uzaklaştırma', value: 'perma_ban' }
                )
        )
        .addStringOption(option =>
            option.setName('kural')
                .setDescription('İhlal edilen kural (Örn: 2.1.12 Basit rol kuralları)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Ceza sebebi / detaylı açıklama')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sure')
                .setDescription('Süreli ceza için süre (Örn: 3d, 12h, 30m) — Kalıcı cezada yok sayılır')
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
        const actionType = interaction.options.getString('tip');
        const rule = interaction.options.getString('kural');
        const reason = interaction.options.getString('sebep');
        const durationInput = interaction.options.getString('sure');

        if (!target) {
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı sunucuda bulunamadı.'));
        }

        let durationMs = null;
        let durationText = null;
        let expiresAt = null;

        if (actionType === 'temp_ban') {
            const parsed = parseDuration(durationInput);
            if (!parsed || parsed.ms <= 0) {
                return interaction.editReply(embeds.error(interaction.guild.name, '❌ Geçersiz süre formatı! Örnekler: `3d`, `12h`, `30m`, `3 gün`'));
            }
            durationMs = parsed.ms;
            durationText = parsed.formatted;
            expiresAt = Date.now() + durationMs;
        } else {
            // Kalıcı uzaklaştırma — süre girişi yok sayılır
            durationText = 'Kalıcı';
        }

        const guild = interaction.guild;
        const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);
        const caseId = generateCaseId();
        const now = Date.now();

        try {
            // Whitelist ve Karakter Onay rolünü al
            const wlRoleId = config.roles?.whitelist;
            if (wlRoleId && target.roles.cache.has(wlRoleId)) {
                await target.roles.remove(wlRoleId, `WL Cezası (${caseId}) - ${rule}`).catch(() => null);
            }
            
            const charApprovedRoleId = config.roles?.characterApproved;
            if (charApprovedRoleId && target.roles.cache.has(charApprovedRoleId)) {
                await target.roles.remove(charApprovedRoleId, `WL Cezası (${caseId}) - ${rule}`).catch(() => null);
            }

            // Uyarı Puanı rollerini al
            const warnRoleRows = db.prepare('SELECT * FROM WLWarningRoles').all();
            const role1Id = warnRoleRows.find(r => r.level === 1)?.roleId || guildConfig?.wlWarning1RoleId;
            if (role1Id && target.roles.cache.has(role1Id)) {
                await target.roles.remove(role1Id, `WL Cezası (${caseId}) - Uyarı Temizleme`).catch(() => null);
            }
            const role2Id = warnRoleRows.find(r => r.level === 2)?.roleId || guildConfig?.wlWarning2RoleId;
            if (role2Id && target.roles.cache.has(role2Id)) {
                await target.roles.remove(role2Id, `WL Cezası (${caseId}) - Uyarı Temizleme`).catch(() => null);
            }

            // Cezalı rolünü ver
            const punishRoleId = guildConfig?.wlPunishRoleId || config.roles?.mute;
            if (punishRoleId && guild.roles.cache.has(punishRoleId)) {
                await target.roles.add(punishRoleId, `WL Cezası (${caseId}) - ${rule}`).catch(() => null);
            }

            // Kalıcı uzaklaştırmada Discord'dan da banla
            if (actionType === 'perma_ban') {
                await target.ban({ reason: `Kalıcı WL Uzaklaştırma (${caseId}) - ${rule}: ${reason}` }).catch(err => console.error('[WL-Ceza] Discord ban hatası:', err));
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
            `).run(caseId, target.id, interaction.user.id, actionType, rule, reason, durationMs, durationText, expiresAt, now);

            // Container Mesajı Oluştur
            const options = {
                actionType,
                caseId,
                guild,
                targetUser: target.user,
                staffUser: interaction.user,
                rule,
                reason,
                durationText,
                expiresAt,
                timestamp: now
            };

            // Bilgilendirme ve Log Kanallarına Gönder
            await sendPunishBroadcast(guild, options);

            const descTitle = actionType === 'temp_ban' ? `${durationText} Süreli Uzaklaştırma` : 'Kalıcı Uzaklaştırma';
            return interaction.editReply({
                ...embeds.success(guild.name, `**${target.user.username}** kullanıcısına **${descTitle}** uygulandı.\n> **Case ID:** \`${caseId}\``)
            });

        } catch (error) {
            console.error('[WL-Ceza Hata]', error);
            return interaction.editReply(embeds.error(guild.name, 'Ceza uygulanırken teknik bir hata oluştu.'));
        }
    }
};
