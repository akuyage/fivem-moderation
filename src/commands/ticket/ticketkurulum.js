const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketkurulum')
        .setDescription('Ticket sistemini bulunduğunuz kanala kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('gorsel')
                .setDescription("Panelde görünecek büyük görsel URL'si (İsteğe bağlı)")
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const gorsel = interaction.options.getString('gorsel');
        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? client.user.displayAvatarURL();

        const containerComponents = [
            // Başlık + Sunucu İkonu
            {
                type: 9, // Section
                components: [
                    {
                        type: 10, // TextDisplay
                        content: `# ${interaction.guild.name}\nLütfen yalnızca gerekli durumlarda ticket açınız; gereksiz ticket açmak uyarı sebebidir. Destek alabilmek için video kaydı gerekmektedir. Ticket açtıktan sonra "merhaba" gibi selamlaşmalar yerine, öncelikle sorununuzu veya talebinizi açıklayınız.\n\nTicket açmak için aşağıda bulunan butonlardan destek almak istediğiniz konuyu seçebilirsiniz.`
                    }
                ],
                accessory: {
                    type: 11, // Thumbnail
                    media: { url: guildIcon }
                }
            }
        ];

        // Eğer büyük görsel URL'si verildiyse ekle
        if (gorsel && (gorsel.startsWith('http://') || gorsel.startsWith('https://'))) {
            containerComponents.push({ type: 14 }); // Ayırıcı
            containerComponents.push({
                type: 12, // MediaGallery
                items: [
                    { media: { url: gorsel } }
                ]
            });
        }

        containerComponents.push(
            { type: 14 }, // Separator
            // Oyun İçi Destek
            {
                type: 9, // Section
                components: [
                    {
                        type: 10,
                        content: `### 🎮 Oyun İçi Destek\nOyun içi sorunlarınız için destek alın.`
                    }
                ],
                accessory: {
                    type: 2,
                    custom_id: 'ticketCreate_ingame',
                    label: 'Oyun İçi Destek',
                    style: 1
                }
            },
            { type: 14 },
            // Oyun Dışı Destek
            {
                type: 9, // Section
                components: [
                    {
                        type: 10,
                        content: `### ☁ Oyun Dışı Destek\nOyun dışı sorunlarınız için destek alın.`
                    }
                ],
                accessory: {
                    type: 2,
                    custom_id: 'ticketCreate_outgame',
                    label: 'Oyun Dışı Destek',
                    style: 2
                }
            },
            { type: 14 },
            // Anticheat Destek
            {
                type: 9, // Section
                components: [
                    {
                        type: 10,
                        content: `### 🛡 Anticheat Destek\nAnticheat ile ilgili sorunlarınız için destek alın.`
                    }
                ],
                accessory: {
                    type: 2,
                    custom_id: 'ticketCreate_anticheat',
                    label: 'Anticheat Destek',
                    style: 4
                }
            },
            { type: 14 },
            // Alt Bilgi
            {
                type: 10,
                content: `### ⏳ Süreç\nTicket'iniz oluşturulduktan sonra yetkililerimiz **en kısa sürede** sizinle ilgilenecektir.`
            }
        );

        await interaction.channel.send({
            flags: (1 << 15), // IS_COMPONENTS_V2
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865F2,
                    components: containerComponents
                }
            ]
        });

        return interaction.reply({
            flags: (1 << 6) | (1 << 15),
            components: [{
                type: 17,
                accent_color: 0x43b581,
                components: [{
                    type: 10,
                    content: `### ${interaction.guild?.name || 'FiveM Moderation'} | Başarılı\n\n---\n✅ Ticket paneli başarıyla oluşturuldu!\n\n-# Powered By akuyage`
                }]
            }]
        });
    }
};
