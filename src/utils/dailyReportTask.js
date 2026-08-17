const db = require('../database/connect');
const config = require('../../config.json');

module.exports = (client) => {
    let lastReportDate = null; // Aynı günde iki kez rapor gönderimini önler

    // Her 1 dakikada bir kontrol et
    setInterval(async () => {
        const now = new Date();
        // Saat 00:00:00 ise raporu gönder
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            const today = now.toDateString();
            if (lastReportDate === today) return; // Bu gün zaten gönderildi
            lastReportDate = today;

            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            const startTime = dayStart.getTime() - (24 * 60 * 60 * 1000); // Dünün başlangıcı
            const endTime = dayStart.getTime(); // Bugünün başlangıcı

            const logs = db.prepare('SELECT * FROM JoinLogs WHERE timestamp >= ? AND timestamp < ?').all(startTime, endTime);

            if (logs.length === 0) return;

            const totalJoins = logs.filter(l => l.isLeave === 0).length;
            const totalLeaves = logs.filter(l => l.isLeave === 1).length;
            const safeJoins = logs.filter(l => l.isLeave === 0 && l.securityLevel === 'Güvenli').length;
            const suspiciousJoins = logs.filter(l => l.isLeave === 0 && l.securityLevel === 'Şüpheli').length;
            const unsafeJoins = logs.filter(l => l.isLeave === 0 && l.securityLevel === 'Güvenli Değil').length;

            // En çok kullanılan davet kodu
            const inviteCounts = {};
            logs.forEach(l => {
                if (l.isLeave === 0 && l.inviteCode !== 'Bilinmiyor') {
                    inviteCounts[l.inviteCode] = (inviteCounts[l.inviteCode] || 0) + 1;
                }
            });

            let topInvite = 'Veri Yok';
            let topInviteCount = 0;
            for (const code in inviteCounts) {
                if (inviteCounts[code] > topInviteCount) {
                    topInvite = code;
                    topInviteCount = inviteCounts[code];
                }
            }

            const reportChannel = client.channels.cache.get(config.channels.inviteReportLog);
            if (reportChannel) {
                const containerComponents = [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: `# Günlük Davet Raporu\nSon 24 saat içerisindeki sunucu giriş-çıkış istatistikleri.`
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: { url: reportChannel.guild.iconURL({ dynamic: true }) || '' }
                        }
                    },
                    { type: 14 },
                    {
                        type: 10,
                        content: `### Giriş / Çıkış Verileri\n> **Toplam Giriş:** \`${totalJoins}\` kişi\n> **Toplam Çıkış:** \`${totalLeaves}\` kişi\n> **Net Değişim:** \`${totalJoins - totalLeaves}\` kişi`
                    },
                    { type: 14 },
                    {
                        type: 10,
                        content: `### Güvenlik Analizi\n> **Güvenilir Üye:** \`${safeJoins}\` kişi\n> **Şüpheli Üye:** \`${suspiciousJoins}\` kişi\n> **Güvenli Olmayan:** \`${unsafeJoins}\` kişi`
                    },
                    { type: 14 },
                    {
                        type: 10,
                        content: `### En Çok Kullanılan Davet\n> **Kod:** \`${topInvite}\`\n> **Kullanım:** \`${topInviteCount}\` adet`
                    },
                    { type: 14 },
                    {
                        type: 10,
                        content: `-# Powered By akuyage`
                    }
                ];

                await reportChannel.send({
                    flags: (1 << 15),
                    components: [{ type: 17, accent_color: 0x5865f2, components: containerComponents }]
                }).catch(() => {});
            }
        }
    }, 60000); // 1 dakika
};
