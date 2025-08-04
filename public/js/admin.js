document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Navigation
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('.admin-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.id === 'nav-logout') return; // Don't prevent default for logout
            
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('hidden'));
            
            // Show corresponding section
            const sectionId = this.id.replace('nav-', '') + '-section';
            document.getElementById(sectionId).classList.remove('hidden');
            
            // Load section data if needed
            if (this.id === 'nav-participants') {
                loadParticipants();
            } else if (this.id === 'nav-logs') {
                loadLogs();
            } else if (this.id === 'nav-settings') {
                loadSettings();
            }
        });
    });
    
    // Participants Section
    const participantsTable = document.getElementById('participants-table');
    const participantsBody = document.getElementById('participants-body');
    const participantsMessage = document.getElementById('participants-message');
    const searchBtn = document.getElementById('search-btn');
    const participantSearch = document.getElementById('participant-search');
    const participantFilter = document.getElementById('participant-filter');
    const exportCsvBtn = document.getElementById('export-csv');
    
    let currentSort = 'created_at';
    let currentOrder = 'desc';
    
    // Load participants on page load
    loadParticipants();
    
    // Search button click
    searchBtn.addEventListener('click', function() {
        loadParticipants();
    });
    
    // Search input enter key
    participantSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadParticipants();
        }
    });
    
    // Filter change
    participantFilter.addEventListener('change', function() {
        loadParticipants();
    });
    
    // Table header sorting
    participantsTable.querySelector('thead').addEventListener('click', function(e) {
        const th = e.target.closest('th');
        if (!th) return;
        
        const sort = th.dataset.sort;
        if (!sort) return;
        
        // Toggle sort order if clicking the same column
        if (sort === currentSort) {
            currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort = sort;
            currentOrder = 'asc';
        }
        
        // Update UI to show sort direction
        document.querySelectorAll('th').forEach(header => {
            header.classList.remove('active-sort');
            const icon = header.querySelector('.sort-icon');
            if (icon) icon.textContent = '↕';
        });
        
        th.classList.add('active-sort');
        const icon = th.querySelector('.sort-icon');
        if (icon) icon.textContent = currentOrder === 'asc' ? '↑' : '↓';
        
        loadParticipants();
    });
    
    // Export CSV Modal
    const csvModal = document.getElementById('csv-export-modal');
    const closeModal = document.querySelector('.close-modal');
    const cancelExport = document.getElementById('cancel-export');
    const confirmExport = document.getElementById('confirm-export');
    const exportName = document.getElementById('export-name');
    const exportEmail = document.getElementById('export-email');
    const exportDate = document.getElementById('export-date');
    const exportTest = document.getElementById('export-test');
    
    // Open modal when clicking export button
    exportCsvBtn.addEventListener('click', function() {
        csvModal.classList.remove('hidden');
    });
    
    // Close modal functions
    function closeExportModal() {
        csvModal.classList.add('hidden');
    }
    
    closeModal.addEventListener('click', closeExportModal);
    cancelExport.addEventListener('click', closeExportModal);
    
    // Export CSV when confirmed
    confirmExport.addEventListener('click', function() {
        const filter = participantFilter.value;
        const fields = [];
        
        if (exportName.checked) fields.push('name');
        if (exportEmail.checked) fields.push('email');
        if (exportDate.checked) fields.push('date');
        if (exportTest.checked) fields.push('test');
        
        // At least one field must be selected
        if (fields.length === 0) {
            alert('Bitte wählen Sie mindestens ein Feld aus.');
            return;
        }
        
        window.location.href = `/api/export-csv?filter=${filter}&fields=${fields.join(',')}`;
        closeExportModal();
    });
    
    // Draw Section
    const drawBtn = document.getElementById('draw-btn');
    const winnersContainer = document.getElementById('winners-container');
    const winnersList = document.getElementById('winners-list');
    const drawMessage = document.getElementById('draw-message');
    const testModeIndicator = document.getElementById('test-mode-indicator').querySelector('span');
    
    // Draw button click
    drawBtn.addEventListener('click', async function() {
        try {
            drawMessage.textContent = '';
            drawMessage.className = 'message hidden';
            winnersContainer.classList.add('hidden');
            
            const response = await fetch('/api/draw', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                displayWinners(data.winners, data.isTestDraw);
            } else {
                showMessage(drawMessage, data.error || 'Ein Fehler ist aufgetreten.', 'error');
            }
        } catch (error) {
            console.error('Draw error:', error);
            showMessage(drawMessage, 'Ein Fehler ist aufgetreten.', 'error');
        }
    });
    
    // Settings Section
    const testModeToggle = document.getElementById('test-mode-toggle');
    const testModeStatus = document.getElementById('test-mode-status');
    const resetTestDataBtn = document.getElementById('reset-test-data-btn');
    const settingsMessage = document.getElementById('settings-message');
    
    // Test mode toggle
    testModeToggle.addEventListener('change', async function() {
        try {
            const enabled = this.checked;
            
            const response = await fetch('/api/test-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ enabled })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                testModeStatus.textContent = data.testMode ? 'Aktiv' : 'Inaktiv';
                testModeIndicator.textContent = data.testMode ? 'Aktiv' : 'Inaktiv';
                showMessage(settingsMessage, `Testmodus ${data.testMode ? 'aktiviert' : 'deaktiviert'}.`, 'success');
            } else {
                this.checked = !enabled; // Revert toggle
                showMessage(settingsMessage, data.error || 'Ein Fehler ist aufgetreten.', 'error');
            }
        } catch (error) {
            console.error('Test mode toggle error:', error);
            this.checked = !this.checked; // Revert toggle
            showMessage(settingsMessage, 'Ein Fehler ist aufgetreten.', 'error');
        }
    });
    
    // Reset test data button
    resetTestDataBtn.addEventListener('click', async function() {
        if (!confirm('Sind Sie sicher, dass Sie alle Testdaten zurücksetzen möchten?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/reset-test-data', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(settingsMessage, data.message || 'Testdaten wurden zurückgesetzt.', 'success');
            } else {
                showMessage(settingsMessage, data.error || 'Ein Fehler ist aufgetreten.', 'error');
            }
        } catch (error) {
            console.error('Reset test data error:', error);
            showMessage(settingsMessage, 'Ein Fehler ist aufgetreten.', 'error');
        }
    });
    
    // Helper Functions
    async function loadParticipants() {
        try {
            const search = participantSearch.value.trim();
            const filter = participantFilter.value;
            
            const response = await fetch(`/api/participants?search=${encodeURIComponent(search)}&sort=${currentSort}&order=${currentOrder}&filter=${filter}`);
            
            if (!response.ok) {
                throw new Error('Failed to load participants');
            }
            
            const participants = await response.json();
            
            // Clear table
            participantsBody.innerHTML = '';
            
            if (participants.length === 0) {
                participantsBody.innerHTML = `<tr><td colspan="5" class="text-center">Keine Teilnehmer gefunden.</td></tr>`;
                return;
            }
            
            // Populate table
            participants.forEach(participant => {
                const row = document.createElement('tr');
                
                const createdDate = new Date(participant.created_at);
                const formattedDate = createdDate.toLocaleDateString('de-DE') + ' ' + 
                                     createdDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                row.innerHTML = `
                    <td>${participant.firstname}</td>
                    <td>${participant.lastname}</td>
                    <td>${participant.email}</td>
                    <td>${formattedDate}</td>
                    <td>${participant.is_test ? 'Ja' : 'Nein'}</td>
                `;
                
                participantsBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading participants:', error);
            showMessage(participantsMessage, 'Fehler beim Laden der Teilnehmer.', 'error');
        }
    }
    
    async function loadLogs() {
        try {
            const logsContainer = document.getElementById('logs-list');
            const logsMessage = document.getElementById('logs-message');
            
            logsContainer.innerHTML = '<div class="loading">Lade Logs...</div>';
            
            const response = await fetch('/api/draw-logs');
            
            if (!response.ok) {
                throw new Error('Failed to load logs');
            }
            
            const logs = await response.json();
            
            // Clear container
            logsContainer.innerHTML = '';
            
            if (logs.length === 0) {
                logsContainer.innerHTML = '<div class="text-center">Keine Ziehungs-Logs vorhanden.</div>';
                return;
            }
            
            // Populate logs
            logs.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                
                const logDate = new Date(log.time);
                const formattedDate = logDate.toLocaleDateString('de-DE') + ' ' + 
                                     logDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                let winnersHtml = '';
                log.winners.sort((a, b) => a.place - b.place).forEach(winner => {
                    winnersHtml += `
                        <div class="log-winner">
                            <div class="winner-place">Platz ${winner.place}</div>
                            <div class="winner-info"><span>Name:</span> ${winner.firstname} ${winner.lastname}</div>
                            <div class="winner-info"><span>E-Mail:</span> ${winner.email}</div>
                        </div>
                    `;
                });
                
                logEntry.innerHTML = `
                    <div class="log-header">
                        <div>
                            <span class="log-time">${formattedDate}</span>
                            ${log.isTest ? '<span class="log-test">Testziehung</span>' : ''}
                        </div>
                        <div class="log-admin">Admin: ${log.admin || 'Unbekannt'}</div>
                    </div>
                    <div class="log-winners">
                        ${winnersHtml}
                    </div>
                `;
                
                logsContainer.appendChild(logEntry);
            });
        } catch (error) {
            console.error('Error loading logs:', error);
            showMessage(logsMessage, 'Fehler beim Laden der Logs.', 'error');
        }
    }
    
    async function loadSettings() {
        try {
            const response = await fetch('/api/test-mode');
            
            if (!response.ok) {
                throw new Error('Failed to load settings');
            }
            
            const data = await response.json();
            
            testModeToggle.checked = data.testMode;
            testModeStatus.textContent = data.testMode ? 'Aktiv' : 'Inaktiv';
            testModeIndicator.textContent = data.testMode ? 'Aktiv' : 'Inaktiv';
        } catch (error) {
            console.error('Error loading settings:', error);
            showMessage(settingsMessage, 'Fehler beim Laden der Einstellungen.', 'error');
        }
    }
    
    function displayWinners(winners, isTestDraw) {
        winnersList.innerHTML = '';
        
        winners.sort((a, b) => a.place - b.place).forEach(winner => {
            const winnerCard = document.createElement('div');
            winnerCard.className = 'winner-card';
            
            winnerCard.innerHTML = `
                <div class="winner-place">Platz ${winner.place}</div>
                <div class="winner-info"><span>Name:</span> ${winner.firstname} ${winner.lastname}</div>
                <div class="winner-info"><span>E-Mail:</span> ${winner.email}</div>
            `;
            
            winnersList.appendChild(winnerCard);
        });
        
        winnersContainer.classList.remove('hidden');
        showMessage(drawMessage, `Ziehung erfolgreich durchgeführt. ${isTestDraw ? '(Testziehung)' : ''}`, 'success');
    }
    
    function showMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`;
    }
});