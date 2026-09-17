/* Optional enhancement: the complete initial story also works without JavaScript. */
'use strict';
function getPartyView(data, id) {
  const statement = data.statements.find(item => item.id === id);
  if (!statement) throw new RangeError('Unknown statement');
  return {
    title: statement.short,
    rows: data.groups.slice(1).map(group => ({
      label: group.label,
      n: group.n,
      value: statement.responses[group.id][0] + statement.responses[group.id][1]
    }))
  };
}
function getComparisonView(rows, cause, order) {
  if (order !== 'editorial' && order !== 'events') throw new RangeError('Unknown order');
  if (cause !== 'all' && !rows.some(row => row.id === cause)) throw new RangeError('Unknown cause');
  const view = rows.filter(row => cause === 'all' || row.id === cause);
  if (order === 'events') view.sort((a, b) => b.events - a.events);
  return view;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { getPartyView, getComparisonView };
if (typeof document !== 'undefined' && typeof window.POLL_DATA !== 'undefined') {
  const select = document.getElementById('statement');
  const title = document.getElementById('party-title');
  const rows = document.querySelectorAll('.party-row');
  const announcement = document.getElementById('chart-announcement');
  const render = () => {
    const view = getPartyView(window.POLL_DATA, select.value);
    title.textContent = view.title;
    rows.forEach((row, i) => {
      row.querySelector('.dot').style.setProperty('--value', view.rows[i].value + '%');
      row.querySelector('.party-value').textContent = view.rows[i].value + '%';
    });
    announcement.textContent = view.title + ': ' + view.rows.map(row => row.label + ' ' + row.value + '%').join('; ') + '.';
  };
  select.addEventListener('change', render);
  render();
  document.getElementById('party-control').hidden = false;
}
if (typeof document !== 'undefined' && document.getElementById('opinion-controls')) {
  const controls = document.getElementById('opinion-controls');
  const cause = document.getElementById('opinion-cause');
  const order = document.getElementById('opinion-order');
  const container = document.getElementById('opinion-rows');
  const status = document.getElementById('opinion-status');
  const entries = Array.from(container.querySelectorAll('[data-opinion-row]'), element => ({
    id: element.dataset.cause, events: Number(element.dataset.events), element
  }));
  const renderComparison = () => {
    const view = getComparisonView(entries, cause.value, order.value);
    entries.forEach(row => { row.element.hidden = true; });
    view.forEach(row => {
      row.element.hidden = false;
      container.appendChild(row.element);
    });
    status.textContent = cause.value === 'all'
      ? `Showing all ${view.length} causes. ${order.value === 'events' ? 'Most recorded event-days first.' : 'Story order.'}`
      : `Showing ${cause.options[cause.selectedIndex].text}. Scales unchanged.`;
  };
  cause.addEventListener('change', renderComparison);
  order.addEventListener('change', renderComparison);
  renderComparison();
  controls.hidden = false;
}
