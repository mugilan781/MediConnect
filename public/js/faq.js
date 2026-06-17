// ============================================================
// MediConnect – public/js/faq.js
// Premium Help Center: Category tabs, live search,
// CMS integration, accordion widget
// ============================================================

const FAQPage = {
  cmsFaqs: [],

  async init() {
    this.bindSearch();
    this.bindTabs();
    this.updateCounts();
    this.bindClearSearch();

    await this.loadCmsFaqs();
  },

  /* ── Category Tabs ── */
  bindTabs() {
    var tabs = document.querySelectorAll('.faq-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('is-active'); });
        this.classList.add('is-active');

        var target = this.getAttribute('data-target');
        var sections = document.querySelectorAll('[data-category]');
        sections.forEach(function(s) {
          if (target === 'all' || s.id === target) {
            s.style.display = '';
          } else {
            s.style.display = 'none';
          }
        });

        FAQPage.updateNoResults();
      });
    });
  },

  /* ── Live Search ── */
  bindSearch() {
    var input = document.getElementById('faqSearch');
    if (!input) return;

    input.addEventListener('input', function() {
      var query = this.value.trim().toLowerCase();
      var wrapper = document.getElementById('faqSearchWrapper');
      if (wrapper) {
        wrapper.classList.toggle('has-value', query.length > 0);
      }

      FAQPage.filterAll(query);
    });
  },

  bindClearSearch() {
    var btn = document.getElementById('faqSearchClear');
    if (!btn) return;

    btn.addEventListener('click', function() {
      var input = document.getElementById('faqSearch');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      }
    });
  },

  filterAll(query) {
    var sections = document.querySelectorAll('[data-category]');
    var anyVisible = false;

    sections.forEach(function(section) {
      var items = section.querySelectorAll('.faq-preview-item');
      var sectionHasVisible = false;

      items.forEach(function(item) {
        var questionEl = item.querySelector('.faq-preview-question');
        var answerEl = item.querySelector('.faq-preview-answer-inner');
        var text = (questionEl ? questionEl.textContent : '') + ' ' + (answerEl ? answerEl.textContent : '');

        // Also check CMS data attribute
        var cmsText = item.getAttribute('data-search-text') || '';

        var matches = !query || text.toLowerCase().includes(query) || cmsText.toLowerCase().includes(query);

        if (query) {
          if (matches) {
            item.classList.remove('is-hidden');
            sectionHasVisible = true;
            anyVisible = true;
          } else {
            item.classList.add('is-hidden');
          }
        } else {
          item.classList.remove('is-hidden');
          sectionHasVisible = true;
          anyVisible = true;
        }
      });

      if (document.querySelector('.faq-tab.is-active').getAttribute('data-target') === 'all') {
        section.style.display = sectionHasVisible ? '' : 'none';
      }
    });

    // Also filter CMS section
    var cmsSection = document.getElementById('faqCmsSection');
    if (cmsSection && cmsSection.style.display !== 'none') {
      var cmsItems = cmsSection.querySelectorAll('.faq-preview-item');
      var cmsVisible = false;
      cmsItems.forEach(function(item) {
        var text = item.getAttribute('data-search-text') || '';
        var questionEl = item.querySelector('.faq-preview-question');
        if (questionEl) text += ' ' + questionEl.textContent;

        var matches = !query || text.toLowerCase().includes(query);
        if (matches) {
          item.classList.remove('is-hidden');
          cmsVisible = true;
          anyVisible = true;
        } else {
          item.classList.add('is-hidden');
        }
      });

      if (document.querySelector('.faq-tab.is-active').getAttribute('data-target') === 'all') {
        cmsSection.style.display = cmsVisible ? '' : 'none';
      }
    }

    FAQPage.showNoResults(!anyVisible);
    FAQPage.updateCounts();
  },

  /* ── No Results ── */
  showNoResults(show) {
    var el = document.getElementById('faqNoResults');
    if (el) {
      el.classList.toggle('is-visible', show);
    }
  },

  updateNoResults() {
    var visibleItems = document.querySelectorAll('.faq-preview-item:not(.is-hidden)');
    this.showNoResults(visibleItems.length === 0);
  },

  /* ── Update counts per tab ── */
  updateCounts() {
    var activeTab = document.querySelector('.faq-tab.is-active');
    var activeTarget = activeTab ? activeTab.getAttribute('data-target') : 'all';

    var counts = { all: 0 };
    document.querySelectorAll('[data-category]').forEach(function(section) {
      var cat = section.getAttribute('data-category');
      var count = section.querySelectorAll('.faq-preview-item:not(.is-hidden)').length;
      counts[cat] = count;
      counts.all += count;
    });

    // Include CMS section
    var cmsSection = document.getElementById('faqCmsSection');
    if (cmsSection && cmsSection.style.display !== 'none') {
      var cmsCount = cmsSection.querySelectorAll('.faq-preview-item:not(.is-hidden)').length;
      counts.all += cmsCount;
    }

    for (var key in counts) {
      var el = document.getElementById('count' + key.charAt(0).toUpperCase() + key.slice(1));
      if (el) el.textContent = counts[key];
    }
  },

  /* ── CMS Load ── */
  async loadCmsFaqs() {
    try {
      var response = await fetch(CONFIG.API_BASE_URL + '/cms/faqs');
      if (!response.ok) return;
      var result = await response.json();
      if (!result.success || !result.data || result.data.length === 0) return;

      this.cmsFaqs = result.data;
      this.renderCmsFaqs(this.cmsFaqs);
    } catch (e) {
      // CMS unavailable — skip
    }
  },

  renderCmsFaqs(list) {
    var container = document.getElementById('faqCmsList');
    var section = document.getElementById('faqCmsSection');
    if (!container || !section) return;

    container.innerHTML = list.map(function(item) {
      var searchText = (item.question + ' ' + item.answer).toLowerCase();
      return '<div class="faq-preview-item" data-search-text="' + FAQPage.escapeAttr(searchText) + '">' +
        '<button class="faq-preview-question" onclick="toggleFaq(this)">' +
          '<span>' + FAQPage.escapeHtml(item.question) + '</span>' +
          '<span class="faq-chevron">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</span>' +
        '</button>' +
        '<div class="faq-preview-answer">' +
          '<div class="faq-preview-answer-inner">' + FAQPage.escapeHtml(item.answer) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    section.style.display = '';
    this.updateCounts();
  },

  /* ── Helpers ── */
  escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

document.addEventListener('DOMContentLoaded', function() {
  FAQPage.init();
});
