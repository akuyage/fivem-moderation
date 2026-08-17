const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
    client.commands = new Collection();
    client.commandsArray = [];

    const commandsPath = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(commandsPath)) return;

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                client.commandsArray.push(command.data.toJSON());
            } else {
                console.log(`[UYARI] Komut dosyası eksik yapılandırılmış: ${file}`);
            }
        }
    }

    console.log(`[Handler] ${client.commands.size} adet komut belleğe yüklendi.`);
};
