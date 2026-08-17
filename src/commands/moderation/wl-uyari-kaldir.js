const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { generateCaseId, buildPunishContainer, sendPunishBroadcast } = require('../../utils/punishTemplate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-uyari-kaldir')
        .setDescription('Kullanıcının Whitelist uyarı puanını bir kademe düşürür veya siler.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Uyarısı kaldırılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Uyarının kaldırılma sebebi')
                .setRequired(false)
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
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu kullanmak için yetkiniz bulunmuyor.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const targetUser = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Yetkili İnisiyatifi';
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);
        const warnRoleRows = db.prepare('SELECT * FROM WLWarningRoles').all();
        const role1Id = warnRoleRows.find(r => r.level === 1)?.roleId || guildConfig?.wlWarning1RoleId;
        const role2Id = warnRoleRows.find(r => r.level === 2)?.roleId || guildConfig?.wlWarning2RoleId;

        let currentLevel = 0;
        if (member) {
            if (role2Id && member.roles.cache.has(role2Id)) {
                currentLevel = 2;
            } else if (role1Id && member.roles.cache.has(role1Id)) {
                currentLevel = 1;
            }
        }

        if (currentLevel === 0) {
            // Kullanıcıda rol yoksa DB'deki yetim aktif kayıtları da temizle
            db.prepare(`
                UPDATE WLPunishments SET active = 0 
                WHERE userId = ? AND actionType = 'warn' AND active = 1
            `).run(targetUser.id);
            return interaction.editReply(embeds.info(guild.name, `**${targetUser.username}** kullanıcısının aktif bir uyarı puanı bulunmuyor.`));
        }

        const caseId = generateCaseId();
        const now = Date.now();
        const removedLevelStr = currentLevel === 2 ? 'II' : 'I';
        const newLevelStr = currentLevel === 2 ? 'I' : '0 (Temizlendi)';

        try {
            if (currentLevel === 2) {
                // Seviye 2'den Seviye 1'e düşür
                if (role2Id && member.roles.cache.has(role2Id)) {
                    await member.roles.remove(role2Id, `Uyarı Kaldırıldı (${caseId})`).catch(() => null);
                }
                if (role1Id && !member.roles.cache.has(role1Id)) {
                    await member.roles.add(role1Id, `Uyarı Seviye 1'e Düşürüldü (${caseId})`).catch(() => null);
                }

                // DB'deki en son aktif uyarıyı pasif yap
                const lastActiveWarn = db.prepare(`
                    SELECT id FROM WLPunishments 
                    WHERE userId = ? AND actionType = 'warn' AND active = 1 
                    ORDER BY id DESC LIMIT 1
                `).get(targetUser.id);

                if (lastActiveWarn) {
                    db.prepare('UPDATE WLPunishments SET active = 0 WHERE id = ?').run(lastActiveWarn.id);
                }
            } else if (currentLevel === 1) {
                // Seviye 1'den tamamen temizle
                if (role1Id && member.roles.cache.has(role1Id)) {
                    await member.roles.remove(role1Id, `Uyarı Kaldırıldı (${caseId})`).catch(() => null);
                }

                // Kullanıcının kalan tüm aktif uyarılarını DB'de pasif yap
                db.prepare(`
                    UPDATE WLPunishments SET active = 0 
                    WHERE userId = ? AND actionType = 'warn' AND active = 1
                `).run(targetUser.id);
            }

            // DB'ye kaldırma log kaydı ekle
            db.prepare(`
                INSERT INTO WLPunishments (caseId, userId, staffId, actionType, warningLevel, reason, timestamp, active)
                VALUES (?, ?, ?, 'warn_remove', ?, ?, ?, 0)
            `).run(caseId, targetUser.id, interaction.user.id, removedLevelStr, reason, now);

            // Container Mesajı Oluştur ve Bildirim Gönder
            const options = {
                actionType: 'warn_remove',
                caseId,
                guild,
                targetUser,
                staffUser: interaction.user,
                warningLevel: removedLevelStr,
                reason,
                timestamp: now
            };

            await sendPunishBroadcast(guild, options);

            return interaction.editReply({
                ...embeds.success(
                    guild.name, 
                    `**${targetUser.username}** kullanıcısının **Uyarı Puanı - ${removedLevelStr}** uyarısı kaldırıldı.\n> **Yeni Durum:** Uyarı Puanı: \`${newLevelStr}\`\n> **Case ID:** \`${caseId}\``
                )
            });

        } catch (error) {
            console.error('[WL-Uyari-Kaldir Hata]', error);
            return interaction.editReply(embeds.error(guild.name, 'Uyarı kaldırılırken bir teknik hata oluştu.'));
        }
    }
};
