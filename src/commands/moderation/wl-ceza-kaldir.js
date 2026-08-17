const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { buildPunishContainer, sendPunishBroadcast } = require('../../utils/punishTemplate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-ceza-kaldir')
        .setDescription('Kullanıcının aktif whitelist cezasını sonlandırır.')
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Cezası kaldırılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Cezayı kaldırma sebebi / notu')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const staffRoleId = config.roles?.staff;
        const isStaff = staffRoleId && interaction.member.roles.cache.has(staffRoleId);
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) && !isStaff) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu komutu kullanmak için Üye Yönet yetkisine veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        const target = interaction.options.getMember('kullanici');
        const reason = interaction.options.getString('sebep') || 'Yetkili tarafından erken sonlandırıldı';

        if (!target) {
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı sunucuda bulunamadı.'));
        }

        const guild = interaction.guild;
        const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);

        // Kullanıcının aktif cezasını bul
        const activePunish = db.prepare(`
            SELECT * FROM WLPunishments 
            WHERE userId = ? AND active = 1 AND actionType IN ('temp_ban', 'perma_ban')
            ORDER BY id DESC LIMIT 1
        `).get(target.id);

        if (!activePunish) {
            return interaction.editReply(embeds.info(guild.name, 'Bu kullanıcının aktif bir whitelist uzaklaştırma cezası bulunamadı.'));
        }

        try {
            // Whitelist ve Karakter Onay rolünü geri ver
            const wlRoleId = config.roles?.whitelist;
            if (wlRoleId) {
                await target.roles.add(wlRoleId, `WL Cezası Kaldırıldı - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }
            
            const charApprovedRoleId = config.roles?.characterApproved;
            if (charApprovedRoleId) {
                await target.roles.add(charApprovedRoleId, `WL Cezası Kaldırıldı - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            // Cezalı rolünü al
            const punishRoleId = guildConfig?.wlPunishRoleId || config.roles?.mute;
            if (punishRoleId && target.roles.cache.has(punishRoleId)) {
                await target.roles.remove(punishRoleId, `WL Cezası Kaldırıldı - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            // DB'de pasife çek
            db.prepare('UPDATE WLPunishments SET active = 0 WHERE id = ?').run(activePunish.id);

            const unbanCaseId = activePunish.caseId;
            const now = Date.now();

            // "Uzaklaştırma Sona Erdi" Container Mesajı
            const options = {
                actionType: 'unban',
                caseId: unbanCaseId,
                guild,
                targetUser: target.user,
                staffUser: interaction.user,
                expiresAt: now,
                timestamp: now
            };

            // Bilgilendirme ve Log Kanallarına Gönder
            await sendPunishBroadcast(guild, options);

            return interaction.editReply({
                ...embeds.success(guild.name, `**${target.user.username}** kullanıcısının uzaklaştırma cezası kaldırıldı.\n> **Referans Case ID:** \`${unbanCaseId}\``)
            });

        } catch (error) {
            console.error('[WL-Ceza-Kaldir Hata]', error);
            return interaction.editReply(embeds.error(guild.name, 'Ceza kaldırılırken bir hata oluştu.'));
        }
    }
};
