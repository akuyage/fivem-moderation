const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cfg-sil')
        .setDescription('Config.json içindeki verileri sıfırlar. Sadece geliştiriciler kullanabilir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(opt =>
            opt.setName('rolleri-koru')
                .setDescription('Evet → Roller korunur, sadece kanallar sıfırlanır. Hayır → Her şey sıfırlanır.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const configPath = path.join(__dirname, '..', '..', '..', 'config.json');
        let config;

        if (!fs.existsSync(configPath)) {
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ `config.json` dosyası bulunamadı. Lütfen dosyanın kök dizinde olduğundan emin olun.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (error) {
            console.error('[CFG SIL OKUMA HATASI]', error);
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ `config.json` okunurken bir hata oluştu. Dosya geçerli JSON formatında mı kontrol edin.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        // Sadece developer kontrolü
        if (!Array.isArray(config.developers) || !config.developers.includes(interaction.user.id)) {
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu sadece bot geliştiricileri kullanabilir.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        const rolleriKoru = interaction.options.getBoolean('rolleri-koru');

        // Channels her zaman sıfırlanır
        if (config.channels) {
            for (const key of Object.keys(config.channels)) {
                config.channels[key] = '';
            }
        }

        // Sunucu IP ve Guild ID sıfırlanır
        config.serverIp = '';
        config.serverTs = '';
        config.guildId = '';

        // Otomatik ceza ayarını varsayılana sıfırla
        config.autoPunish = {
            type: 'temp_ban',
            duration: 259200000
        };

        // Roles sadece "Hayır" seçilirse sıfırlanır
        if (!rolleriKoru && config.roles) {
            for (const key of Object.keys(config.roles)) {
                config.roles[key] = '';
            }
        }


        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('[CFG SIL YAZMA HATASI]', error);
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ `config.json` yazılırken bir hata oluştu. Dosya izinlerini ve disk durumunu kontrol edin.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        const desc = rolleriKoru
            ? '✅ `config.json` içindeki tüm **kanal** verileri sıfırlandı.\n> Roller korundu.\n\nBot 3 saniye içinde yeniden başlayacak...'
            : '✅ `config.json` içindeki tüm **rol** ve **kanal** verileri sıfırlandı.\n\nBot 3 saniye içinde yeniden başlayacak...';

        await interaction.reply({
            ...embeds.success(
                interaction.guild?.name || 'FiveM Moderation',
                desc,
                'Config Sıfırlandı'
            ),
            flags: (1 << 6) | (1 << 15)
        });

        setTimeout(() => process.exit(0), 3000);
    }
};
