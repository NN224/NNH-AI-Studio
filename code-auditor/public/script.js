// ==========================================
// NNH CODE AUDITOR - TWO BOX LAYOUT
// ==========================================

class AuditorApp {
  constructor() {
    this.apiBase = this.getApiBase();
    this.currentAudit = null;

    console.log(`🔗 API Base URL: ${this.apiBase}`);
    this.init();
  }

  getApiBase() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }

  init() {
    console.log('🚀 NNH Code Auditor - Two Box Layout');
    this.attachEventListeners();
    this.checkHealth();
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================

  attachEventListeners() {
    // Component buttons
    document.querySelectorAll('.component-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const component = btn.dataset.component;
        this.startAudit(component);
      });
    });

    // Copy buttons
    document.getElementById('copyResultsBtn')?.addEventListener('click', () => {
      this.copyToClipboard('results');
    });

    document.getElementById('copyFixPromptBtn')?.addEventListener('click', () => {
      this.copyToClipboard('fixPrompt');
    });

    // New audit button
    document.getElementById('newAuditBtn')?.addEventListener('click', () => {
      this.resetUI();
    });
  }

  // ==========================================
  // API CALLS
  // ==========================================

  async checkHealth() {
    try {
      console.log('🏥 Checking backend health...');
      const response = await fetch(`${this.apiBase}/api/health`);

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      console.error('   Make sure the server is running on port 3000');
    }
  }

  async startAudit(component) {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`🔍 Starting ${component} audit...`);
      console.log('═══════════════════════════════════════════');

      // Show status
      this.showStatus(`Auditing ${component}...`, 'Reading files and analyzing with Claude AI');

      // Disable buttons
      this.disableButtons(true);

      // Call API
      const startTime = Date.now();

      console.log('📤 Sending request...');
      const response = await fetch(`${this.apiBase}/api/audit/${component}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }

        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || errorData.details || `API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Audit failed');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log('✅ Audit complete!');
      console.log(`⏱️ Duration: ${duration}s`);
      console.log(`📁 Files analyzed: ${data.filesAnalyzed}`);
      console.log('═══════════════════════════════════════════');

      // Store results
      this.currentAudit = data;

      // Show results in two boxes
      this.showResults(data);

    } catch (error) {
      console.error('❌ Audit error:', error);
      this.showError(`Audit failed: ${error.message}`);
    } finally {
      this.disableButtons(false);
    }
  }

  // ==========================================
  // UI UPDATES
  // ==========================================

  showStatus(title, message) {
    // Hide other sections
    document.getElementById('selectionSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('visible');

    // Show status
    const statusSection = document.getElementById('statusSection');
    statusSection.classList.add('visible');

    document.getElementById('statusTitle').textContent = title;
    document.getElementById('statusMessage').textContent = message;
  }

  showResults(data) {
    // Hide status
    document.getElementById('statusSection').classList.remove('visible');

    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.add('visible');

    // Fill left box: Audit Results
    const auditContent = document.getElementById('auditResultsContent');
    auditContent.innerHTML = `<pre>${this.escapeHtml(data.analysis.content)}</pre>`;

    // Fill right box: Fix Prompt
    const fixPromptContent = document.getElementById('fixPromptContent');
    fixPromptContent.innerHTML = `<pre>${this.escapeHtml(data.fixPrompt)}</pre>`;

    // Show metadata in console
    console.log('📊 Audit Metadata:');
    console.log(`   - Files analyzed: ${data.filesAnalyzed}`);
    console.log(`   - Total lines: ${data.totalLines || 'N/A'}`);
    console.log(`   - Duration: ${data.duration}`);
  }

  showError(message) {
    document.getElementById('statusSection').classList.remove('visible');
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('selectionSection').classList.remove('hidden');

    alert(`❌ Error\n\n${message}\n\nCheck the console for more details (F12).`);
  }

  resetUI() {
    document.getElementById('statusSection').classList.remove('visible');
    document.getElementById('resultsSection').classList.remove('visible');
    document.getElementById('selectionSection').classList.remove('hidden');
    this.currentAudit = null;
  }

  disableButtons(disabled) {
    document.querySelectorAll('.component-btn').forEach(btn => {
      btn.disabled = disabled;
    });
  }

  // ==========================================
  // COPY TO CLIPBOARD
  // ==========================================

  async copyToClipboard(type) {
    if (!this.currentAudit) {
      alert('No data to copy');
      return;
    }

    let textToCopy = '';
    let buttonId = '';

    if (type === 'results') {
      textToCopy = this.currentAudit.analysis.content;
      buttonId = 'copyResultsBtn';
    } else if (type === 'fixPrompt') {
      textToCopy = this.currentAudit.fixPrompt;
      buttonId = 'copyFixPromptBtn';
    }

    try {
      await navigator.clipboard.writeText(textToCopy);

      // Update button
      const btn = document.getElementById(buttonId);
      const originalHTML = btn.innerHTML;

      btn.innerHTML = '<span>✅</span><span>Copied!</span>';
      btn.classList.add('copied');

      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 2000);

      console.log(`✅ ${type === 'results' ? 'Audit Results' : 'Fix Prompt'} copied to clipboard`);

    } catch (error) {
      console.error('❌ Failed to copy:', error);
      alert('Failed to copy to clipboard. Please select and copy manually.');
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ==========================================
// INITIALIZE APP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🔍 NNH Code Auditor                    ║');
  console.log('║  Two-Box Layout with Copy Buttons       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  window.auditorApp = new AuditorApp();
});