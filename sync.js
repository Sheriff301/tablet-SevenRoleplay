const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// --- KONFIGURACJA SUPABASE (Twoje dane) ---
const SUPABASE_URL = 'https://nztwxymmuwecvymbtrgt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56dHd4eW1tdXdlY3Z5bWJ0cmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODYwMjUsImV4cCI6MjA5NjY2MjAyNX0.4tbqTfSamJp3l7x5z0xmliFiNFgguWIDfgLRZsz1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- KONFIGURACJA ER:LC ---
// Oficjalny URL API ER:LC służący do pobierania listy graczy:
const ERLC_API_URL = 'https://api.policeroleplay.community/v1/server/players';

// TUTAJ WKLEJ SWÓJ KLUCZ API Z SERWERA:
const ERLC_SERVER_KEY = 'mVDYPwgZVUZIgdRnsyOt-bXopLTcOhItNCPRYtCgcabvHmIiNdLJWjUYjivsf'; 
// --------------------

async function syncOfficers() {
    try {
        console.log("Pobieranie danych z serwera ER:LC...");
        
        // 1. Pobranie graczy z serwera ER:LC
        const erlcResponse = await axios.get(ERLC_API_URL, {
            headers: { 'Server-Key': ERLC_SERVER_KEY }
        });
        
        const playersOnServer = erlcResponse.data; 
        
        // Tworzymy listę nicków graczy, którzy aktualnie są w zespole policji/szeryfów
        const onDutyRobloxNicks = playersOnServer
            .filter(p => p.Team === 'Police' || p.Team === 'Sheriff' || p.Team === 'State Police')
            .map(p => p.Player);

        // 2. Pobranie wszystkich zaakceptowanych funkcjonariuszy z bazy
        const { data: officers, error } = await supabase
            .from('funkcjonariusze')
            .select('*')
            .eq('status', 'zaakceptowany');

        if (error) throw error;

        // 3. Aktualizacja statusów w bazie
        for (const officer of officers) {
            if (!officer.roblox_nick) continue;

            const isActuallyOnDuty = onDutyRobloxNicks.includes(officer.roblox_nick);

            if (officer.na_sluzbie !== isActuallyOnDuty) {
                await supabase
                    .from('funkcjonariusze')
                    .update({ na_sluzbie: isActuallyOnDuty })
                    .eq('id', officer.id);
                
                console.log(`Zaktualizowano status: ${officer.imie_nazwisko_ic} -> ${isActuallyOnDuty ? 'NA SŁUŻBIE' : 'OFFLINE'}`);
            }
        }
        console.log("Synchronizacja zakończona pomyślnie.");
    } catch (err) {
        console.error("Błąd podczas synchronizacji:", err.message);
    }
}

// Uruchamiaj synchronizację co 60 sekund (60000 ms)
setInterval(syncOfficers, 60000);

syncOfficers();
console.log("Skrypt synchronizujący ER:LC <-> MDT został uruchomiony.");