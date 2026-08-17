const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('basvurumesaj')
        .setDescription('Yetkili başvuru panelini bulunduğunuz kanala gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? client.user.displayAvatarURL();

        await interaction.channel.send({
            flags: (1 << 15), // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // Container - Arka plan veren çerçeve
                    accent_color: 0x5865F2,
                    components: [
                        // Başlık + Sunucu İkonu
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // TextDisplay
                                    content: `# Yetkili Başvuru Paneli\nEkibimize katılmak ve sunucumuza katkı sağlamak istiyorsan doğru yerdesin!`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: { url: guildIcon }
                            }
                        },
                        { type: 14 }, // Separator
                        // Başvuru - Metin + Buton YAN YANA
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10,
                                    content: `### 📝 Başvuru\nFormu doldurmak için sağdaki butona tıklayabilirsin.`
                                }
                            ],
                            accessory: {
                                type: 2, // Button
                                custom_id: 'applyStaff',
                                label: 'Başvuru Yap',
                                style: 3 // Success
                            }
                        },
                        { type: 14 },
                        // Koşullar
                        {
                            type: 10,
                            content: `### 📋 Koşullar\n> • En az **18 yaşında** olmalısın.\n> • Günlük en az **3 saat** aktif olmalısın.\n> • Sunucu kurallarına hakim olmalısın.`
                        },
                        { type: 14 },
                        // Süreç
                        {
                            type: 10,
                            content: `### ⏳ Süreç\nBaşvurun yetkililerimiz tarafından incelenerek **en kısa sürede** değerlendirilecek.\n-# Powered By akuyage • Yetkili Alım Sistemi`
                        }
                    ]
                }
            ]
        });

        await interaction.reply({ ...embeds.success(interaction.guild?.name || 'FiveM Moderation', '✅ Başvuru paneli oluşturuldu!'), flags: (1 << 6) | (1 << 15) });
    }
};
