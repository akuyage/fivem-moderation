const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

const stmts = {
    getStaffStats: db.prepare('SELECT * FROM StaffStats WHERE userId = ?'),
    getUserStats: db.prepare('SELECT * FROM Users WHERE userId = ?')
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yetkili-stat')
        .setDescription('Bir yetkilinin tüm performans ve detaylı istatistiklerini görüntüler.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('İstatistiklerine bakılacak yetkili')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Staff rolü veya Yetki kontrolü
        const staffRoleId = config.roles?.staff;
        const isStaff = (staffRoleId && interaction.member.roles.cache.has(staffRoleId)) ||
                        interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                        interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isStaff) {
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu komutu sadece yetkililer kullanabilir.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        const target = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Belirtilen kullanıcı sunucuda bulunamadı.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        // Veritabanından verileri çek
        const staffStats = stmts.getStaffStats.get(target.id) || { voiceTime: 0, ticketsHandled: 0, interviewsHandled: 0, punishmentsGiven: 0 };
        const userStats = stmts.getUserStats.get(target.id) || { messageCount: 0 };

        const totalVoiceMs = staffStats.voiceTime || 0;
        const voiceHours = Math.floor(totalVoiceMs / 3600000);
        const voiceMinutes = Math.floor((totalVoiceMs % 3600000) / 60000);
        const totalMinutes = Math.floor(totalVoiceMs / 60000);

        // Puan hesaplama formülü
        const punishments = staffStats.punishmentsGiven || 0;
        const tickets = staffStats.ticketsHandled || 0;
        const interviews = staffStats.interviewsHandled || 0;
        const messages = userStats.messageCount || 0;
        const totalPoints = totalMinutes + (tickets * 25) + (interviews * 40) + (punishments * 15);

        const discordJoinDate = `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`;
        const serverJoinDate = `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`;
        const avatar = target.displayAvatarURL({ dynamic: true });

        // V2 Container formatında mesaj oluşturma
        const containerComponents = [
            {
                type: 9, // Section
                components: [
                    {
                        type: 10, // TextDisplay
                        content: `# Yetkili İstatistikleri\n${target.username} kullanıcısının detaylı performans verileri.`
                    }
                ],
                accessory: {
                    type: 11, // Thumbnail
                    media: { url: avatar }
                }
            },
            { type: 14 }, // Separator
            {
                type: 10,
                content: `### Genel Bilgiler\n> **Kullanıcı:** <@${target.id}> (\`${target.id}\`)\n> **Yetkili Puanı:** \`${totalPoints} Puan\`\n> **Discord Kayıt:** ${discordJoinDate}\n> **Sunucu Giriş:** ${serverJoinDate}`
            },
            { type: 14 },
            {
                type: 10,
                content: `### Performans & Moderasyon Verileri\n> **Ses Aktifliği:** \`${voiceHours} saat ${voiceMinutes} dakika\`\n> **Çözülen Ticket:** \`${tickets}\`\n> **Yapılan Mülakat:** \`${interviews}\`\n> **Verilen Ceza:** \`${punishments}\`\n> **Gönderilen Mesaj:** \`${messages}\``
            },
            { type: 14 },
            {
                type: 10,
                content: `-# Powered by akuyage • Yetkili Performans Sistemi`
            }
        ];

        return interaction.reply({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865f2,
                    components: containerComponents
                }
            ]
        });
    }
};

