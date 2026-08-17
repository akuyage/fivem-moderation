const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucunun aktiflik durumunu (Aktif/Bakım/Kapalı) belirtir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('durum')
                .setDescription('Sunucunun güncel durumu')
                .setRequired(true)
                .addChoices(
                    { name: 'Aktif', value: 'aktif' },
                    { name: 'Bakım', value: 'bakim' },
                    { name: 'Kapalı', value: 'kapali' }
                )
        )
        .addStringOption(option =>
            option.setName('resim')
                .setDescription("Gömülü (embed) mesajda görünecek büyük resim URL'si (İsteğe bağlı)")
                .setRequired(false)
        ),

    async execute(interaction) {
        const durum = interaction.options.getString('durum');
        const resim = interaction.options.getString('resim');
        
        let durumText = '';
        let durumColor = '';
        let aciklamaText = '';
        let buttonLabel = '';
        let buttonStyle = ButtonStyle.Success;
        let isLink = false;

        const serverIp = config.serverIp || 'Belirtilmedi';
        const serverTs = config.serverTs && config.serverTs.trim() !== '' ? config.serverTs : 'Voice Chat';

        switch (durum) {
            case 'aktif':
                durumText = 'Aktif';
                durumColor = '#43b581'; // Yeşil
                aciklamaText = 'Sunucumuz artık **Aktif**, sunucuya giriş sağlayabilirsiniz.';
                buttonLabel = 'Sunucuya Bağlan';
                buttonStyle = ButtonStyle.Link;
                isLink = true;
                break;
            case 'bakim':
                durumText = 'Bakım';
                durumColor = '#faa61a'; // Sarı/Turuncu
                aciklamaText = 'Sunucumuz şu anda **Bakım** aşamasındadır. Lütfen duyuruları takip edin.';
                buttonLabel = 'Bakımda';
                buttonStyle = ButtonStyle.Secondary;
                isLink = false;
                break;
            case 'kapali':
                durumText = 'Kapalı';
                durumColor = '#f04747'; // Kırmızı
                aciklamaText = 'Sunucumuz şu anda **Kapalı**dır. En kısa sürede tekrar aktif olacağız.';
                buttonLabel = 'Sunucu Kapalı';
                buttonStyle = ButtonStyle.Danger;
                isLink = false;
                break;
        }

        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();

        const containerComponents = [
            {
                type: 9, // Section
                components: [
                    {
                        type: 10,
                        content: `### ${interaction.guild.name} — Sunucu Durumu\n${aciklamaText}\n\n**Sunucu Durumu:** ${durumText}\n**Sunucu IP Adresi:** \`${serverIp}\`\n**Sunucu TS Adresi:** \`${serverTs}\`\n\n||@everyone & @here||`
                    }
                ],
                accessory: {
                    type: 11, // Thumbnail
                    media: { url: guildIcon }
                }
            },
            { type: 14 } // Separator
        ];

        // Eğer büyük resim URL'si verildiyse
        if (resim && (resim.startsWith('http://') || resim.startsWith('https://'))) {
            containerComponents.splice(1, 0, {
                type: 12, // MediaGallery
                items: [
                    { media: { url: resim } }
                ]
            });
        }

        // Butonu Container'ın içine (border içine) ActionRow olarak ekliyoruz
        const buttonObj = {
            type: 2, // Button
            label: buttonLabel,
            style: buttonStyle,
            disabled: !isLink // Eğer linkse tıklanabilir yapıyoruz, değilse sadece görüntü amaçlı pasif
        };

        if (isLink) {
            buttonObj.url = `https://cfx.re/join/${serverIp}`;
        } else {
            buttonObj.custom_id = 'server_status_btn';
        }

        containerComponents.push({
            type: 1, // ActionRow
            components: [buttonObj]
        });

        // Alt bilgi (Footer)
        containerComponents.push({ type: 14 });
        containerComponents.push({
            type: 10,
            content: `-# Powered By akuyage`
        });

        await interaction.channel.send({ 
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: parseInt(durumColor.replace('#', ''), 16),
                    components: containerComponents
                }
            ] 
        });
        
        return interaction.reply({ ...embeds.success(interaction.guild?.name || 'FiveM Moderation', 'Sunucu durum mesajı başarıyla gönderildi.'), flags: (1 << 6) | (1 << 15) });
    }
};
