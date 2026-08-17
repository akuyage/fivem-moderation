const db = require('../connect');

function setupTables() {
    // Kullanıcı bilgileri, istatistikleri ve seviyeleri
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Users (
            userId TEXT PRIMARY KEY,
            messageCount INTEGER DEFAULT 0,
            voiceTime INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            invites INTEGER DEFAULT 0
        )
    `).run();

    // Ceza sistemi (Ban, Mute, Warn, Blacklist)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Punishments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            moderatorId TEXT,
            type TEXT,
            reason TEXT,
            timestamp INTEGER,
            duration INTEGER,
            active INTEGER DEFAULT 1
        )
    `).run();

    // Bilet (Ticket) verileri
    const oldTicketInfo = db.prepare("PRAGMA table_info(Tickets)").all();
    if (oldTicketInfo.length > 0) {
        const hasCategory = oldTicketInfo.some(c => c.name === 'category');
        if (!hasCategory) {
            console.log('[Database] Tickets tablosunda category sütunu bulunamadı. Yeni şemaya geçiriliyor...');
            db.prepare('DROP TABLE Tickets').run();
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS Tickets (
            channelId TEXT PRIMARY KEY,
            userId TEXT,
            status TEXT DEFAULT 'open',
            category TEXT,
            claimedBy TEXT,
            createdAt INTEGER
        )
    `).run();

    // Sunucu içi sayaçlar veya konfigürasyon (Ekipler, vs)
    const oldGuildConfigInfo = db.prepare("PRAGMA table_info(GuildConfig)").all();
    if (oldGuildConfigInfo.length > 0) {
        const checkAndAdd = (colName, colType) => {
            if (!oldGuildConfigInfo.some(c => c.name === colName)) {
                db.prepare(`ALTER TABLE GuildConfig ADD COLUMN ${colName} ${colType}`).run();
                console.log(`[Database] GuildConfig tablosuna ${colName} sütunu eklendi.`);
            }
        };
        checkAndAdd('wlPunishRoleId', 'TEXT');
        checkAndAdd('dailyInviteLogChannel', 'TEXT');
        checkAndAdd('wlAnnounceChannelId', 'TEXT');
        checkAndAdd('wlWarning1RoleId', 'TEXT');
        checkAndAdd('wlWarning2RoleId', 'TEXT');
        checkAndAdd('autoPunishType', "TEXT DEFAULT 'temp_ban'"); // 'temp_ban' veya 'perma_ban'
        checkAndAdd('autoPunishDuration', 'INTEGER DEFAULT 259200000'); // 3 gün = 3*24*60*60*1000
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GuildConfig (
            guildId TEXT PRIMARY KEY,
            totalTickets INTEGER DEFAULT 0,
            wlPunishRoleId TEXT,
            dailyInviteLogChannel TEXT,
            wlAnnounceChannelId TEXT,
            wlWarning1RoleId TEXT,
            wlWarning2RoleId TEXT,
            autoPunishType TEXT DEFAULT 'temp_ban',
            autoPunishDuration INTEGER DEFAULT 259200000
        )
    `).run();

    // Yetkililer
    const oldStaffInfo = db.prepare("PRAGMA table_info(StaffStats)").all();
    if (oldStaffInfo.length > 0) {
        const hasInterviews = oldStaffInfo.some(c => c.name === 'interviewsHandled');
        if (!hasInterviews) {
            db.prepare('ALTER TABLE StaffStats ADD COLUMN interviewsHandled INTEGER DEFAULT 0').run();
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS StaffStats (
            userId TEXT PRIMARY KEY,
            voiceTime INTEGER DEFAULT 0,
            ticketsHandled INTEGER DEFAULT 0,
            interviewsHandled INTEGER DEFAULT 0,
            punishmentsGiven INTEGER DEFAULT 0
        )
    `).run();

    // Ekipler (Takımlar) — Sayısal ID bazlı, boşluk dolduran
    // Eski tablo varsa sil ve yeniden oluştur (şema değişikliği)
    const oldTableInfo = db.prepare("PRAGMA table_info(Teams)").all();
    if (oldTableInfo.length > 0) {
        const columns = oldTableInfo.map(c => c.name);
        // Eski şemada 'id' sütunu yoksa veya 'name' PRIMARY KEY ise migration gerekli
        const pkColumn = oldTableInfo.find(c => c.pk === 1);
        if (pkColumn && pkColumn.name === 'name') {
            console.log('[Database] Teams tablosu eski şemada (name PK). Yeni şemaya geçiriliyor...');
            db.prepare('DROP TABLE Teams').run();
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS Teams (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            roleId TEXT,
            channelId TEXT,
            leaderId TEXT,
            ogId TEXT,
            memberLimit INTEGER,
            points INTEGER DEFAULT 0
        )
    `).run();

    // Ekip Davet/Ayrılma Kilitleri (24 Saat Kuralları)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS TeamLocks (
            userId TEXT,
            teamId INTEGER,
            lockType TEXT,
            lockedUntil INTEGER
        )
    `).run();

    // Karaliste
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Blacklist (
            userId TEXT PRIMARY KEY,
            reason TEXT,
            moderatorId TEXT,
            timestamp INTEGER
        )
    `).run();

    // Davetler (Sunucudaki invite linkleri)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Invites (
            code TEXT PRIMARY KEY,
            inviterId TEXT,
            uses INTEGER DEFAULT 0
        )
    `).run();

    // Kullanıcı Davet İstatistikleri
    db.prepare(`
        CREATE TABLE IF NOT EXISTS InviteStats (
            userId TEXT PRIMARY KEY,
            total INTEGER DEFAULT 0,
            regular INTEGER DEFAULT 0,
            leaves INTEGER DEFAULT 0,
            fake INTEGER DEFAULT 0
        )
    `).run();

    // Çekiliş Sistemi
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Giveaways (
            messageId TEXT PRIMARY KEY,
            channelId TEXT,
            guildId TEXT,
            prize TEXT,
            winnersCount INTEGER,
            endTime INTEGER,
            hostId TEXT,
            status TEXT DEFAULT 'active'
        )
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS GiveawayParticipants (
            messageId TEXT,
            userId TEXT,
            PRIMARY KEY (messageId, userId)
        )
    `).run();

    // Whitelist (FiveM Mülakat Sistemi)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Whitelist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            moderatorId TEXT,
            steamHex TEXT,
            steamProfileUrl TEXT,
            status TEXT DEFAULT 'pending',
            interviewChannelId TEXT,
            logMessageId TEXT,
            timestamp INTEGER
        )
    `).run();

    // Bilet (Ticket) Transkriptleri
    db.prepare(`
        CREATE TABLE IF NOT EXISTS Transcripts (
            ticketId INTEGER PRIMARY KEY,
            html TEXT
        )
    `).run();

    // Davet/Giriş Logları (Günlük rapor için)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS JoinLogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            inviterId TEXT,
            inviteCode TEXT,
            securityLevel TEXT,
            isLeave INTEGER DEFAULT 0,
            timestamp INTEGER
        )
    `).run();

    // Whitelist Cezaları & Uyarıları
    const oldWLPunInfo = db.prepare("PRAGMA table_info(WLPunishments)").all();
    if (oldWLPunInfo.length > 0) {
        const hasCaseId = oldWLPunInfo.some(c => c.name === 'caseId');
        if (!hasCaseId) {
            console.log('[Database] WLPunishments tablosu yeni Case ID formatına geçiriliyor...');
            db.prepare('DROP TABLE IF EXISTS WLPunishments').run();
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS WLPunishments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caseId TEXT UNIQUE NOT NULL,
            userId TEXT NOT NULL,
            staffId TEXT,
            actionType TEXT NOT NULL, -- 'warn', 'temp_ban', 'perma_ban', 'unban'
            warningLevel TEXT, -- 'I', 'II'
            rule TEXT,
            reason TEXT,
            duration INTEGER, -- ms
            durationText TEXT, -- '3 gün'
            expiresAt INTEGER,
            timestamp INTEGER,
            active INTEGER DEFAULT 1
        )
    `).run();

    // Whitelist Uyarı Rolleri (1, 2)
    const oldWLWarnInfo = db.prepare("PRAGMA table_info(WLWarningRoles)").all();
    if (oldWLWarnInfo.length > 0) {
        const hasLevel = oldWLWarnInfo.some(c => c.name === 'level');
        if (!hasLevel) {
            console.log('[Database] WLWarningRoles tablosu eski şemada (xCount). Yeni 2 seviyeli şemaya geçiriliyor...');
            db.prepare('DROP TABLE IF EXISTS WLWarningRoles').run();
        }
    }

    db.prepare(`
        CREATE TABLE IF NOT EXISTS WLWarningRoles (
            level INTEGER PRIMARY KEY, -- 1: Uyarı Puanı - I, 2: Uyarı Puanı - II
            roleId TEXT
        )
    `).run();

    // Geçmişte ceza almış kullanıcıların eski aktif uyarılarını pasife çek (Senkronizasyon)
    try {
        db.prepare(`
            UPDATE WLPunishments 
            SET active = 0 
            WHERE actionType = 'warn' AND active = 1 
            AND timestamp <= (
                SELECT COALESCE(MAX(timestamp), 0) 
                FROM WLPunishments p2 
                WHERE p2.userId = WLPunishments.userId 
                AND p2.actionType IN ('temp_ban', 'perma_ban')
            )
        `).run();
    } catch (e) {}

    console.log('[Database] SQLite tabloları başarıyla kontrol edildi/oluşturuldu.');
}

module.exports = setupTables;
