const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmduyuru')
        .setDescription('Seçilen roldeki herkese özel mesaj (DM) gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('Mesajın gönderileceği rol')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj içeriği')
                .setRequired(true)
        ),

    async execute(interaction) {
        // İşlem uzun sürebileceği için deferReply kullanıyoruz
        await interaction.deferReply();

        const role = interaction.options.getRole('rol');
        const mesaj = interaction.options.getString('mesaj');

        // Üyeleri önbelleğe al (cache boşsa API'ye git, doluysa dokunma)
        if (role.members.size === 0) {
            await interaction.guild.members.fetch({ force: false });
        }
        const members = role.members;

        if (members.size === 0) {
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu role sahip hiçbir üye bulunamadı.'));
        }

        // Gönderen bilgisini içeren buton (Görseldeki gibi: isim - id)
        const senderButton = new ButtonBuilder()
            .setCustomId('dm_sender_info')
            .setLabel(`${interaction.user.username} - ${interaction.user.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true); // Sadece bilgi amaçlı

        const row = new ActionRowBuilder().addComponents(senderButton);

        // Sunucunun davet linkini otomatik oluşturup ikinci butona ekliyoruz
        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 0, // Sınırsız
                maxUses: 0 // Sınırsız
            });

            const serverButton = new ButtonBuilder()
                .setLabel(interaction.guild.name)
                .setStyle(ButtonStyle.Link)
                .setURL(invite.url);
            
            row.addComponents(serverButton);
        } catch (err) {
            // Davet linki oluşturulamazsa (yetki vs.) bu butonu es geç
        }

        let basarili = 0;
        const failedIds = [];
        let processedCount = 0;

        // Herkese DM atmaya başla (Rate limit korumalı)
        for (const [memberId, member] of members) {
            if (member.user.bot) continue; // Botlara mesaj atma

            try {
                await member.send({
                    content: mesaj,
                    components: [row]
                });
                basarili++;
            } catch (error) {
                // Kullanıcının DM'leri kapalıysa buraya düşer
                failedIds.push(memberId);
            }

            processedCount++;
            // Her 10 DM gönderiminde Discord rate limit'e takılmamak için 1 saniye bekle
            if (processedCount % 10 === 0) {
                await new Promise(r => setTimeout(r, 1000));
            } else {
                // Bireysel istekler arasında ufak bir bekleme
                await new Promise(r => setTimeout(r, 100));
            }
        }

        let failedText = `- Başarısız (DM Kapalı): **${failedIds.length}**`;
        if (failedIds.length > 0) {
            const idsString = failedIds.map(id => `<@${id}> (\`${id}\`)`).join(', ');
            if (idsString.length > 1500) {
                failedText += `\n> **Ulaşılamayan Bazı Üyeler:** ${idsString.substring(0, 1500)}... *(Çok fazla kişi olduğu için sınırlandırıldı)*`;
            } else {
                failedText += `\n> **Ulaşılamayan Üyeler:** ${idsString}`;
            }
        }

        // Kanala gönderilecek bildirim Embed'i (Görseldeki mavi çizgili mesaj)
        const embed = new EmbedBuilder()
            .setColor('#2b2d31') // Discord'un koyu tema rengine yakın bir renk
            .setAuthor({ 
                name: interaction.user.username, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(`**${mesaj}**\n\n> Seçilen role mesaj gönderildi.\n- Başarılı: **${basarili}**\n${failedText}`)
            .setFooter({ 
                text: `${interaction.client.user.username} | Yetkili Bildirim Sistemi`, 
                iconURL: interaction.client.user.displayAvatarURL() 
            });

        await interaction.editReply({ embeds: [embed] });
    }
};
