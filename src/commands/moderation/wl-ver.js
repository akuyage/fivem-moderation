const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connect');
const config = require('../../../config.json');
const embeds = require('../../utils/embeds');
const { resolveToHex } = require('../../utils/steamResolver');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wl-ver')
        .setDescription('Kullanıcıya Whitelist rolü verir ve Steam HEX kaydını işler.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Whitelist verilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('steam')
                .setDescription('Steam HEX ID (steam:11000...) veya Steam Profil URL')
                .setRequired(true)
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
        const steamInput = interaction.options.getString('steam').trim();
        const guild = interaction.guild;
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.editReply(embeds.error(guild.name, 'Kullanıcı sunucuda bulunamadı.'));
        }

        try {
            // Steam HEX Çözümle (HEX veya Profil URL kabul eder)
            const { hex, steamId64 } = await resolveToHex(steamInput);
            const isUrl = steamInput.includes('steamcommunity.com');
            const profileUrl = isUrl ? steamInput : `https://steamcommunity.com/profiles/${steamId64}`;

            // Rolleri Yönet
            const wlRoleId = config.roles?.whitelist;
            if (wlRoleId && guild.roles.cache.has(wlRoleId)) {
                await member.roles.add(wlRoleId, `WL Verildi - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            const unregRoleId = config.roles?.unregistered;
            if (unregRoleId && member.roles.cache.has(unregRoleId)) {
                await member.roles.remove(unregRoleId, `WL Verildi - Yetkili: ${interaction.user.tag}`).catch(() => null);
            }

            // Veritabanını Güncelle / Ekle
            const now = Date.now();
            const existing = db.prepare('SELECT id FROM Whitelist WHERE userId = ? ORDER BY id DESC LIMIT 1').get(targetUser.id);

            if (existing) {
                db.prepare(`
                    UPDATE Whitelist 
                    SET status = 'approved', steamHex = ?, steamProfileUrl = ?, moderatorId = ?, timestamp = ?
                    WHERE id = ?
                `).run(hex, profileUrl, interaction.user.id, now, existing.id);
            } else {
                db.prepare(`
                    INSERT INTO Whitelist (userId, moderatorId, steamHex, steamProfileUrl, status, timestamp)
                    VALUES (?, ?, ?, ?, 'approved', ?)
                `).run(targetUser.id, interaction.user.id, hex, profileUrl, now);
            }

            // Yetkili İstatistiğini Güncelle
            db.prepare('INSERT OR IGNORE INTO StaffStats (userId) VALUES (?)').run(interaction.user.id);
            db.prepare('UPDATE StaffStats SET interviewsHandled = interviewsHandled + 1 WHERE userId = ?').run(interaction.user.id);

            // Log Kanalına Bildirim Gönder
            const logChannelId = config.channels?.interviewLog;
            if (logChannelId) {
                const logChannel = await guild.channels.fetch(logChannelId).catch(() => null);
                if (logChannel) {
                    await logChannel.send({
                        flags: (1 << 15),
                        components: [
                            {
                                type: 17,
                                accent_color: 0x2ecc71,
                                components: [
                                    {
                                        type: 10,
                                        content: `# Whitelist Verildi\n**Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n**Yetkili:** <@${interaction.user.id}>\n**Steam HEX:** \`${hex}\`\n**Steam Profil:** ${profileUrl}`
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
                    `**${targetUser.username}** kullanıcısına Whitelist rolü verildi.\n\n> **Steam HEX:** \`${hex}\`\n> **Profil:** [Steam Profili](${profileUrl})`
                )
            });

        } catch (error) {
            console.error('[WL-Ver Hata]', error);
            return interaction.editReply(embeds.error(guild.name, `Steam bilgisi doğrulanamadı: ${error.message}`));
        }
    }
};
