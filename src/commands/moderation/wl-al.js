const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connect');
const config = require('../../../config.json');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-al')
        .setDescription('Kullanıcının Whitelist rolünü alır ve kaydını günceller.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Whitelist rolü alınacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Whitelist alma sebebi')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
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
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.editReply(embeds.error(guild.name, 'Kullanıcı sunucuda bulunamadı.'));
        }

        try {
            // Whitelist ve Karakter Onay rolünü al
            const wlRoleId = config.roles?.whitelist;
            if (wlRoleId && member.roles.cache.has(wlRoleId)) {
                await member.roles.remove(wlRoleId, `WL Alındı - Sebep: ${reason} - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            const charApprovedRoleId = config.roles?.characterApproved;
            if (charApprovedRoleId && member.roles.cache.has(charApprovedRoleId)) {
                await member.roles.remove(charApprovedRoleId, `WL Alındı - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            // Uyarı Puanı rollerini de temizle
            const guildConfig = db.prepare('SELECT * FROM GuildConfig WHERE guildId = ?').get(guild.id);
            const warnRoleRows = db.prepare('SELECT * FROM WLWarningRoles').all();
            const role1Id = warnRoleRows.find(r => r.level === 1)?.roleId || guildConfig?.wlWarning1RoleId;
            if (role1Id && member.roles.cache.has(role1Id)) {
                await member.roles.remove(role1Id, `WL Alındı - Uyarı Temizleme`).catch(() => null);
            }
            const role2Id = warnRoleRows.find(r => r.level === 2)?.roleId || guildConfig?.wlWarning2RoleId;
            if (role2Id && member.roles.cache.has(role2Id)) {
                await member.roles.remove(role2Id, `WL Alındı - Uyarı Temizleme`).catch(() => null);
            }

            // Unregistered (Kayıtsız) rolü ver
            const unregRoleId = config.roles?.unregistered;
            if (unregRoleId && !member.roles.cache.has(unregRoleId)) {
                await member.roles.add(unregRoleId, `WL Alındı - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            // Kullanıcının DB'deki tüm aktif uyarılarını pasife çek
            db.prepare(`
                UPDATE WLPunishments SET active = 0 
                WHERE userId = ? AND actionType = 'warn' AND active = 1
            `).run(targetUser.id);

            // Veritabanını Güncelle / Ekle
            const now = Date.now();
            const existing = db.prepare('SELECT id FROM Whitelist WHERE userId = ? ORDER BY id DESC LIMIT 1').get(targetUser.id);

            if (existing) {
                db.prepare(`
                    UPDATE Whitelist 
                    SET status = 'revoked', moderatorId = ?, timestamp = ?
                    WHERE id = ?
                `).run(interaction.user.id, now, existing.id);
            } else {
                db.prepare(`
                    INSERT INTO Whitelist (userId, moderatorId, status, timestamp)
                    VALUES (?, ?, 'revoked', ?)
                `).run(targetUser.id, interaction.user.id, now);
            }

            // Log Kanalına Gönder
            const logChannelId = config.channels?.interviewLog;
            if (logChannelId) {
                const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    await logChannel.send({
                        flags: (1 << 15),
                        components: [
                            {
                                type: 17,
                                accent_color: 0xe74c3c,
                                components: [
                                    {
                                        type: 10,
                                        content: `# Whitelist Alındı\n**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n**Yetkili:** <@${interaction.user.id}>\n**Sebep:** ${reason}`
                                    }
                                ]
                            }
                        ]
                    }).catch(() => {});
                }
            }

            return interaction.editReply({
                ...embeds.success(
                    guild.name,
                    `**${targetUser.username}** kullanıcısının Whitelist rolü alındı.\n> **Sebep:** ${reason}`
                )
            });

        } catch (error) {
            console.error('[WL-Al Hata]', error);
            return interaction.editReply(embeds.error(guild.name, 'Whitelist alınırken bir hata oluştu.'));
        }
    }
};
