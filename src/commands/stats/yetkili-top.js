const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yetkili-top')
        .setDescription('Yetkili puan sıralamasını gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const stats = db.prepare('SELECT * FROM StaffStats').all();

        if (stats.length === 0) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Henüz kaydedilmiş yetkili istatistiği bulunmuyor.'), flags: (1 << 6) | (1 << 15) });
        }

        // Puan hesaplama ve sıralama
        const leaderboard = stats.map(s => {
            const voiceMinutes = Math.floor(s.voiceTime / 60000);
            const ticketPoints = s.ticketsHandled * 25;
            const interviewPoints = s.interviewsHandled * 40;
            const totalPoints = voiceMinutes + ticketPoints + interviewPoints;

            return {
                userId: s.userId,
                voiceMinutes,
                tickets: s.ticketsHandled,
                interviews: s.interviewsHandled,
                totalPoints
            };
        }).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);

        const guildIcon = interaction.guild.iconURL({ dynamic: true });

        // V2 Container formatında mesaj oluşturma
        const containerComponents = [
            {
                type: 9, // Section
                components: [
                    {
                        type: 10,
                        content: `# Yetkili Leaderboard\nSunucu içerisindeki en aktif yetkililerin puan sıralaması aşağıdadır.`
                    }
                ],
                accessory: {
                    type: 11,
                    media: { url: guildIcon || '' }
                }
            },
            { type: 14 } // Separator
        ];

        let listText = '';

        for (let i = 0; i < leaderboard.length; i++) {
            const s = leaderboard[i];
            listText += `**${i + 1}. <@${s.userId}>** \`${s.totalPoints} Puan\` • \`${s.voiceMinutes}dk\` Ses | \`${s.tickets}\` Ticket | \`${s.interviews}\` Mülakat\n`;
        }

        containerComponents.push({
            type: 10,
            content: listText || 'Sıralama yapılabilecek yeterli veri yok.'
        });

        containerComponents.push({ type: 14 });
        containerComponents.push({
            type: 10,
            content: `Puanlama: 1 dk Ses = 1 Puan | 1 Ticket = 25 Puan | 1 Mülakat = 40 Puan`
        });

        await interaction.channel.send({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865f2,
                    components: containerComponents
                }
            ]
        });

        return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Yetkili sıralaması gönderildi.'), flags: (1 << 6) | (1 << 15) });
    }
};
