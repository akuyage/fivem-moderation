const { Collection } = require('discord.js');

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function generateTranscript(channel, ticket, metadata) {
    // 1. Fetch all messages in the channel
    let messages = new Collection();
    let lastId;
    let iterationCount = 0;
    const MAX_ITERATIONS = 100; // Maksimum 100 * 100 = 10.000 mesaj

    while (iterationCount < MAX_ITERATIONS) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const fetched = await channel.messages.fetch(options);
        messages = messages.concat(fetched);
        if (fetched.size !== 100) break;
        lastId = fetched.last().id;
        iterationCount++;
    }

    // Sort oldest to newest
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // 2. Build Message HTML
    let messagesHtml = '';
    messages.forEach(msg => {
        if (!msg.content && msg.attachments.size === 0 && msg.embeds.length === 0) return;

        const avatarUrl = msg.author.displayAvatarURL({ extension: 'png', size: 128 });
        const time = dateFormatter.format(msg.createdAt);

        // Escape HTML
        let content = escapeHTML(msg.content);

        // Attachments
        let attachmentsHtml = '';
        msg.attachments.forEach(att => {
            if (att.contentType && att.contentType.startsWith('image/')) {
                attachmentsHtml += `<img class="attachment" src="${att.url}" alt="Attachment">`;
            } else {
                attachmentsHtml += `<div class="file-attachment">📎 <a href="${att.url}" target="_blank">${att.name}</a></div>`;
            }
        });

        messagesHtml += `
        <div class="message">
            <img class="avatar" src="${avatarUrl}" alt="Avatar">
            <div class="msg-body">
                <div class="msg-header">
                    <span class="username">${escapeHTML(msg.author.username)}</span>
                    <span class="timestamp">${time}</span>
                </div>
                <div class="msg-content">${content}</div>
                ${attachmentsHtml}
            </div>
        </div>`;
    });

    // 3. Build Full HTML
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(channel.guild.name)} | Ticket #${ticket.id}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #111214; color: #dbdee1; font-family: 'Inter', sans-serif; }
        
        .header { 
            background: linear-gradient(135deg, #1e1f22, #2b2d31); 
            padding: 50px 20px; 
            border-bottom: 1px solid #3f4147; 
            text-align: center; 
        }
        .header h1 { margin: 0; color: #fff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: #949ba4; font-size: 16px; margin-top: 12px; }
        
        .info-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            gap: 20px; 
            max-width: 900px; 
            margin: -30px auto 40px auto; 
            padding: 0 20px;
        }
        .info-card { 
            background: #1e1f22; 
            border-radius: 12px; 
            padding: 20px; 
            text-align: left; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.2); 
            border: 1px solid #2b2d31; 
            border-top: 4px solid #5865F2;
        }
        .info-card:nth-child(1) { border-top-color: #23a559; }
        .info-card:nth-child(2) { border-top-color: #faa61a; }
        .info-card:nth-child(3) { border-top-color: #f23f42; }
        
        .info-card h3 { margin: 0 0 6px 0; font-size: 11px; color: #80848e; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .info-card p { margin: 0; font-size: 16px; font-weight: 600; color: #f2f3f5; }
        .info-card small { display: block; margin-top: 4px; font-size: 12px; color: #949ba4; font-weight: 400; }
        
        .messages { max-width: 900px; margin: 0 auto; padding: 0 20px 60px 20px; }
        .message { display: flex; margin-bottom: 28px; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin-right: 16px; flex-shrink: 0; background-color: #2b2d31; }
        .msg-body { flex: 1; min-width: 0; }
        .msg-header { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; }
        .username { color: #f2f3f5; font-weight: 600; font-size: 16px; }
        .timestamp { color: #949ba4; font-size: 12px; }
        .msg-content { color: #dbdee1; font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
        
        .attachment { margin-top: 12px; border-radius: 8px; max-width: 400px; width: 100%; height: auto; display: block; border: 1px solid #2b2d31; }
        .file-attachment { margin-top: 10px; background: #2b2d31; padding: 10px 16px; border-radius: 6px; display: inline-block; font-size: 14px; }
        .file-attachment a { color: #00a8fc; text-decoration: none; }
        .file-attachment a:hover { text-decoration: underline; }
        
        /* Discord Markdown Styles */
        .msg-content b, .msg-content strong { font-weight: 700; color: #fff; }
        .msg-content i, .msg-content em { font-style: italic; }
        .msg-content u { text-decoration: underline; }
        .msg-content s { text-decoration: line-through; }
        .msg-content code { background: #1e1f22; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 14px; }
        .msg-content pre { background: #1e1f22; padding: 12px; border-radius: 6px; overflow-x: auto; border: 1px solid #2b2d31; margin: 8px 0; }
        .msg-content pre code { padding: 0; background: transparent; border: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ ${escapeHTML(channel.guild.name)}</h1>
        <p>Ticket #${ticket.id} • Transkript Arşivi</p>
    </div>
    
    <div class="info-grid">
        <div class="info-card">
            <h3>Açan Kullanıcı</h3>
            <p>${escapeHTML(metadata.creatorName)}</p>
            <small>ID: ${metadata.creatorId}</small>
        </div>
        <div class="info-card">
            <h3>İlgilenen Yetkili</h3>
            <p>${escapeHTML(metadata.claimedByName)}</p>
            <small>ID: ${metadata.claimedById}</small>
        </div>
        <div class="info-card">
            <h3>Kapatan Kişi</h3>
            <p>${escapeHTML(metadata.closerName)}</p>
            <small>ID: ${metadata.closerId}</small>
        </div>
        <div class="info-card">
            <h3>Ticket Durumu</h3>
            <p>${escapeHTML(metadata.closeReason)}</p>
            <small>Kategori: ${escapeHTML(ticket.category || 'Destek')}</small>
        </div>
    </div>

    <div class="messages">
        ${messagesHtml || "<div style=\"text-align: center; color: #949ba4; padding: 40px;\">Bu Ticket'ta hiçbir mesaj bulunmuyor.</div>"}
    </div>

    <div class="footer" style="text-align: center; margin-top: 40px; padding: 20px; border-top: 1px solid #313338; color: #949ba4; font-size: 0.8rem;">
        <p>${escapeHTML(channel.guild.name)} • Powered by akuyage</p>
        <p>${new Date().toLocaleString('tr-TR')}</p>
    </div>
</body>
</html>`;

    return html;
}

module.exports = generateTranscript;
