/**
 * Steam Profil URL'sinden FiveM HEX ID çıkarma yardımcısı.
 * 
 * Desteklenen formatlar:
 * - https://steamcommunity.com/profiles/76561198006409530
 * - https://steamcommunity.com/id/customurl
 * - Direkt SteamID64 (sayısal)
 * 
 * Çıktı: "steam:110000106b7da8a"
 */

/**
 * Steam profil URL'sinden SteamID64 çözümler.
 * @param {string} input - Steam profil URL'si veya SteamID64
 * @returns {Promise<string>} SteamID64
 */
async function resolveSteamId64(input) {
    input = input.trim();

    // Direkt FiveM HEX girilmişse (Örn: steam:110000106b7da8a veya 110000106b7da8a)
    const cleanHex = input.replace(/^steam:/i, '').trim();
    if (/^[0-9a-fA-F]{14,16}$/.test(cleanHex)) {
        try {
            return BigInt(`0x${cleanHex}`).toString();
        } catch (e) {}
    }

    // Direkt SteamID64 girilmişse
    if (/^\d{17}$/.test(input)) {
        return input;
    }

    // URL formatlarını parse et
    const profilesMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (profilesMatch) {
        return profilesMatch[1];
    }

    const customMatch = input.match(/steamcommunity\.com\/id\/([^\/\s?]+)/);
    if (customMatch) {
        const customUrl = customMatch[1];
        // Steam XML API'den SteamID64 çek
        const xmlUrl = `https://steamcommunity.com/id/${customUrl}/?xml=1`;

        const response = await fetch(xmlUrl);
        if (!response.ok) {
            throw new Error(`Steam API isteği başarısız: ${response.status}`);
        }

        const xml = await response.text();
        const steamIdMatch = xml.match(/<steamID64>(\d{17})<\/steamID64>/);
        if (!steamIdMatch) {
            throw new Error('Steam profili bulunamadı veya gizli.');
        }

        return steamIdMatch[1];
    }

    throw new Error('Geçersiz Steam profil URL formatı. Desteklenen: steamcommunity.com/profiles/... veya steamcommunity.com/id/...');
}

/**
 * SteamID64'ü FiveM HEX formatına dönüştürür.
 * @param {string} steamId64 - 17 haneli SteamID64
 * @returns {string} "steam:110000xxxxxxxxx" formatında HEX
 */
function steamId64ToHex(steamId64) {
    return `steam:${BigInt(steamId64).toString(16)}`;
}

/**
 * Steam profil URL'sinden direkt FiveM HEX ID üretir.
 * @param {string} input - Steam profil URL'si veya SteamID64
 * @returns {Promise<{hex: string, steamId64: string}>}
 */
async function resolveToHex(input) {
    const steamId64 = await resolveSteamId64(input);
    const hex = steamId64ToHex(steamId64);
    return { hex, steamId64 };
}

module.exports = { resolveSteamId64, steamId64ToHex, resolveToHex };
