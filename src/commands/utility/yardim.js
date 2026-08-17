const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('FiveM Moderation botunun komutlarını ve özelliklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const description = `FiveM Moderation botunun tüm komutları ve alt sistemleri aşağıda listelenmiştir.\n\n` +
            `Moderasyon\n` +
            `- /ban, /unban, /perma-ban, /perma-unban, /banaffi\n` +
            `- /mute, /unmute, /allmute\n` +
            `- /wl-ver, /wl-al\n` +
            `- /wl-uyari, /wl-uyari-kaldir, /wl-ceza, /wl-ceza-kaldir, /otoceza\n` +
            `- /sicil\n` +
            `- /rol-ver, /rol-al\n\n` +
            `Bilet (Ticket)\n` +
            `- /ticketkurulum\n\n` +
            `İstatistik ve Bilgi\n` +
            `- /kullanici-bilgi, /davetler, /nerede\n` +
            `- /yetkili-stat, /yetkili-top\n\n` +
            `Yetkili ve Ekip\n` +
            `- /ekip-olustur, /ekip-sil, /ekip-bilgi, /ekip-davet, /ekip-puan\n` +
            `- /cek, /dagit, /yetkilises, /basvurumesaj\n\n` +
            `Çekiliş Sistemi\n` +
            `/cekilis-baslat, /cekilis-bitir, /cekilis-reroll\n\n` +
            `Sunucu ve Sistem Kurulumu\n` +
            `- /kur, /kaldir, /db-sil, /cfg-duzenle, /cfg-sil\n` +
            `- /sunucu, /dmduyuru, /yardim\n\n` +
            `Geliştirici & Yapımcı: **akuyage**\n` +
            `Not: Bu komut sadece yetkililerin kullanımına açıktır.`;

        const replyData = embeds.info(null, description, 'FiveM Moderation | Yardım');

        // Komutun sadece kullanan kisiye (ephemeral) gorunmesini sagliyoruz.
        await interaction.reply({ ...replyData, flags: (1 << 6) | (1 << 15) });
    }
};
