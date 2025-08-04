# Digitale Tombola – Alpenverein Melk

Eine digitale Tombola-Anwendung für den Alpenverein Melk, die es ermöglicht, Teilnehmer zu registrieren und Gewinner zu ziehen.

## Funktionen

- Digitale Teilnehmerregistrierung
- Admin-Panel mit Login-Schutz
- Teilnehmerübersicht mit Suche, Sortierung und Filterung
- CSV-Export der Teilnehmerdaten
- Ziehungsmodul für 3 Gewinner
- Protokollierung aller Ziehungen
- Testmodus für Probeläufe

## Technische Details

- **Server:** Node.js mit Express
- **Frontend:** HTML, CSS, JavaScript
- **Datenbank:** MySQL/MariaDB
- **Authentifizierung:** bcrypt + express-session

## Installation

### Voraussetzungen

- Node.js (v20.x empfohlen)
- MySQL oder MariaDB

### Schritte

1. Repository klonen oder Dateien herunterladen

2. Abhängigkeiten installieren:
   ```
   npm install
   ```

3. Datenbank einrichten:
   - Erstellen Sie eine MySQL/MariaDB-Datenbank
   - Führen Sie das SQL-Script `database.sql` aus, um die Tabellen zu erstellen

4. Umgebungsvariablen konfigurieren:
   - Kopieren Sie die `.env`-Datei und passen Sie die Werte an Ihre Umgebung an
   - Ändern Sie insbesondere die Datenbank-Zugangsdaten und das Session-Secret

5. Server starten:
   ```
   npm start
   ```

6. Anwendung aufrufen:
   - Formular: `http://localhost:3000/form`
   - Admin-Login: `http://localhost:3000/login`
   - Standard-Admin: Benutzername `admin`, Passwort `admin123` (bitte ändern!)

## Produktionsumgebung

Für den Einsatz in einer Produktionsumgebung:

1. Setzen Sie `NODE_ENV=production` in der `.env`-Datei
2. Ändern Sie das `SESSION_SECRET` zu einem sicheren Wert
3. Ändern Sie die Standard-Admin-Zugangsdaten
4. Konfigurieren Sie einen Reverse-Proxy (z.B. Nginx) mit HTTPS

## Sicherheitshinweise

- Die Anwendung sollte nur über HTTPS zugänglich sein
- Ändern Sie die Standard-Admin-Zugangsdaten vor dem Einsatz
- Beschränken Sie den Datenbankzugriff auf den Anwendungsserver

## Lizenz

Diese Anwendung wurde für den Alpenverein Melk entwickelt und darf nur mit Genehmigung verwendet werden.