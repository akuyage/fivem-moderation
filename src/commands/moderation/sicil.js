const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { formatDateTR } = require('../../utils/punishTemplate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicil')
        .setDescription('Seçilen kullanıcının tüm sicil geçmişini görüntüler.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Sicili görüntülenecek kullanıcı')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Staff Kontrolü
        const staffRoleId = config.roles?.staff;
        const isStaff = (staffRoleId && interaction.member.roles.cache.has(staffRoleId))
            || interaction.member.permissions.has(PermissionFlagsBits.Administrator)
            || config.developers.includes(interaction.user.id);

        if (!isStaff) {
            return interaction.reply({
                content: '❌ Bu komutu kullanmak için yetkiniz bulunmuyor.',
                flags: (1 << 6)
            });
        }

        await interaction.deferReply({ flags: (1 << 6) }); // Sadece komutu kullanan kişiye görünür

        const targetUser = interaction.options.getUser('kullanici');
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);

        // ─── 1. Aktif Uyarı Puanı ───
        const warnRoleRows = db.prepare('SELECT * FROM WLWarningRoles').all();
        const role1Id = warnRoleRows.find(r => r.level === 1)?.roleId || guildConfig?.wlWarning1RoleId;
        const role2Id = warnRoleRows.find(r => r.level === 2)?.roleId || guildConfig?.wlWarning2RoleId;

        let activeWarningLevel = 'Yok';

        if (member) {
            if (role2Id && role1Id && member.roles.cache.has(role2Id) && member.roles.cache.has(role1Id)) {
                activeWarningLevel = 'Uyarı Puanı - I & II';
            } else if (role2Id && member.roles.cache.has(role2Id)) {
                activeWarningLevel = 'Uyarı Puanı - II';
            } else if (role1Id && member.roles.cache.has(role1Id)) {
                activeWarningLevel = 'Uyarı Puanı - I';
            } else {
                activeWarningLevel = 'Yok';
            }
        } else {
            // Kullanıcı sunucuda değilse DB'den aktif uyarı sayısına bak
            const activeWarnCount = db.prepare(`
                SELECT COUNT(*) as count FROM WLPunishments 
                WHERE userId = ? AND actionType = 'warn' AND active = 1
            `).get(targetUser.id)?.count || 0;

            if (activeWarnCount >= 2) {
                activeWarningLevel = `${activeWarnCount} Aktif Uyarı (DB)`;
            } else if (activeWarnCount === 1) {
                activeWarningLevel = '1 Aktif Uyarı (DB)';
            }
        }

        // ─── 2. WL Uyarı Geçmişi ───
        const wlWarnings = db.prepare(`
            SELECT * FROM WLPunishments 
            WHERE userId = ? AND actionType IN ('warn', 'warn_remove') 
            ORDER BY timestamp DESC LIMIT 10
        `).all(targetUser.id);

        let warnHistory = '';
        if (wlWarnings.length === 0) {
            warnHistory = '> Kayıt bulunamadı.';
        } else {
            warnHistory = wlWarnings.map(w => {
                const icon = w.actionType === 'warn' ? '⚠️' : '✅';
                const label = w.actionType === 'warn' ? `Uyarı (${w.warningLevel || '?'})` : `Kaldırıldı (${w.warningLevel || '?'})`;
                const date = formatDateTR(w.timestamp);
                const status = w.active ? '🟢 Aktif' : '⚫ Pasif';
                return `> ${icon} \`${w.caseId}\` — ${label} — ${date} — ${status}${w.rule ? ` — Kural: ${w.rule}` : ''}`;
            }).join('\n');
        }

        // ─── 3. WL Ceza Geçmişi ───
        const wlPunishments = db.prepare(`
            SELECT * FROM WLPunishments 
            WHERE userId = ? AND actionType IN ('temp_ban', 'perma_ban', 'unban') 
            ORDER BY timestamp DESC LIMIT 10
        `).all(targetUser.id);

        let punishHistory = '';
        if (wlPunishments.length === 0) {
            punishHistory = '> Kayıt bulunamadı.';
        } else {
            punishHistory = wlPunishments.map(p => {
                let icon = '🔴';
                let label = 'Bilinmeyen';
                if (p.actionType === 'temp_ban') { icon = '🕐'; label = `Süreli (${p.durationText || '?'})`; }
                else if (p.actionType === 'perma_ban') { icon = '🚫'; label = 'Kalıcı'; }
                else if (p.actionType === 'unban') { icon = '✅'; label = 'Kaldırıldı'; }
                const date = formatDateTR(p.timestamp);
                const status = p.active ? '🟢 Aktif' : '⚫ Pasif';
                return `> ${icon} \`${p.caseId}\` — ${label} — ${date} — ${status}${p.rule ? ` — Kural: ${p.rule}` : ''}`;
            }).join('\n');
        }

        // ─── 4. Genel Ban Geçmişi (Punishments tablosu) ───
        const bans = db.prepare(`
            SELECT * FROM Punishments 
            WHERE userId = ? AND type = 'ban' 
            ORDER BY timestamp DESC LIMIT 10
        `).all(targetUser.id);

        let banHistory = '';
        if (bans.length === 0) {
            banHistory = '> Kayıt bulunamadı.';
        } else {
            banHistory = bans.map(b => {
                const date = formatDateTR(b.timestamp);
                const status = b.active ? '🟢 Aktif' : '⚫ Pasif';
                return `> 🔨 ${date} — ${status} — ${b.reason || 'Sebep belirtilmemiş'}`;
            }).join('\n');
        }

        // ─── 5. Genel Mute Geçmişi (Punishments tablosu) ───
        const mutes = db.prepare(`
            SELECT * FROM Punishments 
            WHERE userId = ? AND type = 'mute' 
            ORDER BY timestamp DESC LIMIT 10
        `).all(targetUser.id);

        let muteHistory = '';
        if (mutes.length === 0) {
            muteHistory = '> Kayıt bulunamadı.';
        } else {
            muteHistory = mutes.map(m => {
                const date = formatDateTR(m.timestamp);
                const status = m.active ? '🟢 Aktif' : '⚫ Pasif';
                return `> 🔇 ${date} — ${status} — ${m.reason || 'Sebep belirtilmemiş'}`;
            }).join('\n');
        }

        // ─── 6. İC İsim Geçmişi (Whitelist mülakat kayıtları) ───
        const wlRecords = db.prepare(`
            SELECT * FROM Whitelist 
            WHERE userId = ? 
            ORDER BY timestamp DESC LIMIT 10
        `).all(targetUser.id);

        let icHistory = '';
        if (wlRecords.length === 0) {
            icHistory = '> Kayıt bulunamadı.';
        } else {
            icHistory = wlRecords.map(w => {
                const date = formatDateTR(w.timestamp);
                const statusEmoji = w.status === 'approved' ? '✅' : w.status === 'rejected' ? '❌' : '⏳';
                return `> ${statusEmoji} ${date} — Durum: ${w.status} — Steam: ${w.steamHex || 'Bilinmiyor'}`;
            }).join('\n');
        }

        // ─── Embed Oluştur ───
        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${targetUser.username} — Sicil Kaydı`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setColor(0x2b2d31)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '📊 Aktif Uyarı Durumu', value: `> ${activeWarningLevel}`, inline: false },
                { name: '⚠️ WL Uyarı Geçmişi', value: warnHistory, inline: false },
                { name: '🛡️ WL Ceza Geçmişi', value: punishHistory, inline: false },
                { name: '🔨 Ban Geçmişi', value: banHistory, inline: false },
                { name: '🔇 Mute Geçmişi', value: muteHistory, inline: false },
                { name: '📋 Whitelist / Mülakat Geçmişi', value: icHistory, inline: false },
            )
            .setFooter({ text: `Powered by akuyage • Sorgulayan: ${interaction.user.username}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
