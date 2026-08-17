const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('db-sil')
        .setDescription('Veritabanındaki tüm verileri temizler (Sadece Geliştiriciler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Developer Kontrolü
        if (!config.developers.includes(interaction.user.id)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu sadece bot geliştiricileri kullanabilir.'), flags: (1 << 6) | (1 << 15) });
        }

        try {
            // Tüm tabloları bul (sqlite iç tabloları hariç)
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
            
            // İşlem (Transaction) başlat
            const deleteTransaction = db.transaction(() => {
                for (const table of tables) {
                    db.prepare(`DELETE FROM ${table.name}`).run();
                }
            });

            deleteTransaction();

            // VACUUM ile veritabanı dosyasını sıkıştır
            db.pragma('vacuum');

            return interaction.reply({ ...embeds.success(interaction.guild?.name || 'FiveM Moderation', '✅ Veritabanındaki tüm tablolar başarıyla temizlendi.'), flags: (1 << 6) | (1 << 15) });

        } catch (error) {
            console.error('[DB-SIL HATA]', error);
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Veritabanı temizlenirken bir hata oluştu.'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
