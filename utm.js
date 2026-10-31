/*
 * First-touch UTM capture for trydiscipler.com.
 *
 * Every page loads this file. When a visitor lands from a tagged link
 * (?utm_source=...&utm_medium=...&utm_campaign=...), the tags are kept in the
 * browser, so they survive clicking through to apply.html. The first tagged
 * visit wins for 90 days; a later tagged visit does not overwrite it.
 *
 * The application form reads them with window.DisciplerUTM.values(), in the
 * order of DisciplerUTM.fields, and sends them as extra columns.
 * Tagged links are built on the Links page of the Discipler Ops hub.
 */
(function () {
  var KEY = 'discipler_utm';
  var FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
  var MAX_LENGTH = 200;

  // localStorage, else sessionStorage, else nothing (some private modes throw).
  function storage() {
    var names = ['localStorage', 'sessionStorage'];
    for (var i = 0; i < names.length; i++) {
      try {
        var s = window[names[i]];
        s.setItem(KEY + '_probe', '1');
        s.removeItem(KEY + '_probe');
        return s;
      } catch (e) {}
    }
    return null;
  }

  // Values go into a tab-separated row, so tabs, line breaks and other control
  // characters are dropped, and length is capped.
  function clean(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_LENGTH);
  }

  function fromUrl() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return null;
    }
    var tags = {};
    var found = false;
    for (var i = 0; i < FIELDS.length; i++) {
      var value = clean(params.get(FIELDS[i]));
      tags[FIELDS[i]] = value;
      if (value) found = true;
    }
    return found ? tags : null;
  }

  function stored(store) {
    if (!store) return null;
    try {
      var saved = JSON.parse(store.getItem(KEY) || 'null');
      if (saved && typeof saved.captured_at === 'number' && Date.now() - saved.captured_at < MAX_AGE_MS) {
        return saved;
      }
      store.removeItem(KEY);
    } catch (e) {}
    return null;
  }

  var store = storage();
  var landing = fromUrl();
  var firstTouch = stored(store);

  if (landing && !firstTouch) {
    firstTouch = landing;
    firstTouch.captured_at = Date.now();
    try {
      if (store) store.setItem(KEY, JSON.stringify(firstTouch));
    } catch (e) {}
  }

  window.DisciplerUTM = {
    fields: FIELDS.slice(),
    // The first-touch tags in `fields` order, '' where missing.
    values: function () {
      var tags = stored(store) || firstTouch || {};
      return FIELDS.map(function (field) {
        return clean(tags[field]);
      });
    }
  };
})();
