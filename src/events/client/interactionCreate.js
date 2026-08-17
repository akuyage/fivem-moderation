const { Events } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Slash Komutları
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);

                // Komut Log Kanalına Gönder
                const commandLogChannel = interaction.guild?.channels.cache.get(config.channels?.commandLogChannel);
                if (commandLogChannel && interaction.guild) {
                    const logEmbed = embeds.logSuccess(`**Komut:** \`/${interaction.commandName}\`\n**Kullanıcı:** <@${interaction.user.id}>\n**Kanal:** <#${interaction.channelId}>`, 'Komut Kullanıldı');
                    await commandLogChannel.send(logEmbed).catch(() => {});
                }
            } catch (error) {
                console.error(`[KOMUT HATASI] ${interaction.commandName}:`, error);
                const errorEmbed = embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu komut çalıştırılırken teknik bir hata oluştu.');

                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    } else {
                        await interaction.reply({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    }
                } catch (_) { /* interaction süresi dolmuş olabilir */ }
            }
        }
        // Buton Etkileşimleri
        else if (interaction.isButton()) {
            // Dinamik buton desteği (örn: acceptStaff_12345)
            const buttonId = interaction.customId.split('_')[0];
            const button = client.buttons.get(buttonId);
            if (!button) return;

            try {
                await button.execute(interaction, client);
            } catch (error) {
                console.error(`[BUTON HATASI] ${interaction.customId}:`, error);
                const errorEmbed = embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu işlem çalıştırılırken teknik bir hata oluştu.');
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    } else {
                        await interaction.reply({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    }
                } catch (_) { /* interaction süresi dolmuş olabilir */ }
            }
        }
        // Modal Gönderimleri (Form Onayları)
        else if (interaction.isModalSubmit()) {
            const modalId = interaction.customId.split('_')[0];
            const modal = client.modals.get(modalId);
            if (!modal) return;

            try {
                await modal.execute(interaction, client);
            } catch (error) {
                console.error(`[MODAL HATASI] ${interaction.customId}:`, error);
                const errorEmbed = embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Form işlenirken teknik bir hata oluştu.');
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    } else {
                        await interaction.reply({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    }
                } catch (_) { /* interaction süresi dolmuş olabilir */ }
            }
        }
        // Seçim Menüsü Etkileşimleri
        else if (interaction.isAnySelectMenu()) {
            const menuId = interaction.customId.split('_')[0];
            const menu = client.selectMenus.get(menuId);
            if (!menu) return;

            try {
                await menu.execute(interaction, client);
            } catch (error) {
                console.error(`[MENÜ HATASI] ${interaction.customId}:`, error);
                const errorEmbed = embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Menü işlenirken teknik bir hata oluştu.');
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    } else {
                        await interaction.reply({ ...errorEmbed, flags: (1 << 6) | (1 << 15) });
                    }
                } catch (_) { /* interaction süresi dolmuş olabilir */ }
            }
        }
        // Otomatik Tamamlama (Autocomplete) Etkileşimleri
        else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(`[AUTOCOMPLETE HATASI] ${interaction.commandName}:`, error);
            }
        }
    }
};
