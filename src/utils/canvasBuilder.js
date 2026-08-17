const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Eğer assets/fonts altında özel bir font varsa kaydet
try {
    const fontsDir = path.join(__dirname, '../../assets/fonts');
    if (fs.existsSync(fontsDir)) {
        const fontFiles = fs.readdirSync(fontsDir);
        for (const file of fontFiles) {
            if (file.endsWith('.ttf') || file.endsWith('.otf') || file.endsWith('.woff2')) {
                const fontName = path.parse(file).name;
                GlobalFonts.registerFromPath(path.join(fontsDir, file), fontName);
            }
        }
    }
} catch (e) {
    console.warn('[Canvas] Özel font yükleme uyarısı:', e.message);
}

const FONT_STACK = '"Inter", "Segoe UI", "Roboto", "DejaVu Sans", "Helvetica Neue", Arial, sans-serif';

module.exports = {
    buildProfileCard: async (user, stats) => {
        const canvas = createCanvas(800, 300);
        const ctx = canvas.getContext('2d');

        // 1. Yuvarlatılmış kart kırpması
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, 800, 300, 18);
        ctx.clip();

        // 2. Koyu siyah & antrasit gradient arka plan (Monochrome)
        const bgGrad = ctx.createLinearGradient(0, 0, 800, 300);
        bgGrad.addColorStop(0, '#131417');
        bgGrad.addColorStop(0.5, '#0b0c0e');
        bgGrad.addColorStop(1, '#050506');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 300);

        // 3. Arka plan estetik geometrik çizgileri
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 1;
        for (let r = 80; r <= 320; r += 60) {
            ctx.beginPath();
            ctx.arc(800, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        for (let r = 50; r <= 200; r += 50) {
            ctx.beginPath();
            ctx.arc(0, 300, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 4. Kart dış çerçevesi (İnce cam efekti)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1, 1, 798, 298, 18);
        ctx.stroke();

        // 5. Kullanıcı Avatarı
        const avatarX = 110;
        const avatarY = 150;
        const avatarR = 65;

        // Dış halka parlaması
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.stroke();

        try {
            const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await loadImage(avatarURL);

            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
            ctx.restore();
        } catch (err) {
            // Avatar yüklenemezse koyu gri zemin
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
            ctx.fillStyle = '#1e2025';
            ctx.fill();
        }

        // Avatar beyaz ana çerçevesi
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 6. Kullanıcı Adı
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 28px ${FONT_STACK}`;
        const nameText = (user.username || 'KULLANICI').toUpperCase();
        ctx.fillText(nameText, 215, 68);

        // 7. Seviye ve XP Metinleri
        const level = stats.level || 1;
        const xp = stats.xp || 0;
        const xpRequired = Math.max(level * 1000, 1);

        ctx.fillStyle = '#b0b4ba';
        ctx.font = `bold 15px ${FONT_STACK}`;
        ctx.fillText(`SEVİYE: ${level}`, 215, 102);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#8a8e95';
        ctx.font = `600 14px ${FONT_STACK}`;
        ctx.fillText(`XP: ${xp} / ${xpRequired}`, 755, 102);

        // 8. XP Bar (Siyah / Beyaz / Gümüş)
        const barX = 215;
        const barY = 114;
        const barW = 540;
        const barH = 12;
        const barR = 6;

        // Bar Arka Planı
        ctx.fillStyle = '#1c1d22';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barR);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bar Doluluk (Beyaz / Parlak Gümüş)
        const fillPercent = Math.max(0, Math.min(xp / xpRequired, 1));
        const fillWidth = Math.max(barR * 2, fillPercent * barW);

        const barGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
        barGrad.addColorStop(0, '#ffffff');
        barGrad.addColorStop(1, '#d5d8de');
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barH, barR);
        ctx.fill();

        // 9. İstatistik Kutucukları (Mesaj, Ses, Davet — Emojisiz, Sade & Modern)
        const hours = Math.floor((stats.voiceTime || 0) / 3600000);
        const mins = Math.floor(((stats.voiceTime || 0) % 3600000) / 60000);
        const voiceText = `${hours}s ${mins}d`;

        const statsData = [
            { label: 'MESAJ', value: String(stats.messageCount || 0), x: 215, w: 165 },
            { label: 'SES', value: voiceText, x: 395, w: 175 },
            { label: 'DAVET', value: String(stats.invites || 0), x: 585, w: 170 }
        ];

        const boxY = 145;
        const boxH = 92;

        statsData.forEach(st => {
            // Kutu arka planı
            ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
            ctx.beginPath();
            ctx.roundRect(st.x, boxY, st.w, boxH, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Kutu Başlığı (Gri & Sade)
            ctx.textAlign = 'left';
            ctx.fillStyle = '#7a7e85';
            ctx.font = `bold 12px ${FONT_STACK}`;
            ctx.fillText(st.label, st.x + 16, boxY + 30);

            // Kutu Değeri (Net Beyaz)
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 22px ${FONT_STACK}`;
            ctx.fillText(st.value, st.x + 16, boxY + 66);
        });

        // 10. Sağ Alt 'powered by akuyage'
        ctx.textAlign = 'right';
        ctx.fillStyle = '#555860';
        ctx.font = `500 11px ${FONT_STACK}`;
        ctx.fillText('powered by akuyage', 755, 268);

        ctx.restore();

        return canvas.toBuffer('image/png');
    }
};


