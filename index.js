require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const setupTables = require('./src/database/models/setupTables');

// Veritabanı tablolarını başlat
setupTables();

// Discord Client oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
    rest: {
        timeout: 30000,
        retries: 3
    }
});


// Handler'ları çalıştır
require('./src/handlers/commandHandler')(client);
require('./src/handlers/eventHandler')(client);
require('./src/handlers/componentHandler')(client);

// Hata ayıklama (Uygulamanın çökmesini önlemek için)
process.on('unhandledRejection', error => {
    console.error('[Anti-Crash] Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error, origin) => {
    console.error('[Anti-Crash] Uncaught Exception:', error);
    console.error('[Anti-Crash] Exception origin:', origin);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[Anti-Crash Monitor] Uncaught Exception Monitor:', error);
});

// Bot girişi
if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('[HATA] Lütfen .env dosyasındaki BOT_TOKEN değerini ayarlayın!');
} else {
    client.login(process.env.BOT_TOKEN).catch(err => {
        console.error("[HATA] Bot tokeni geçersiz veya Discord API'ye ulaşılamıyor.", err);
    });
}
