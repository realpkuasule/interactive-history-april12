// Pure catalog validation and filtering, shared by static Library builds and browsers.
function validDate(value) {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function requireValue(condition, message) {
  if (!condition) throw new Error(`Invalid Library catalog: ${message}`);
}
function publicUrl(value) {
  if (!nonempty(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') ? url : null;
  } catch { return null; }
}

export function validateCatalog(catalog) {
  requireValue(catalog && typeof catalog === 'object', 'expected an object');
  requireValue(nonempty(catalog.title) && nonempty(catalog.description), 'title and description are required');
  requireValue(Array.isArray(catalog.projects), 'projects must be an array');
  const ids = new Set();
  for (const project of catalog.projects) {
    requireValue(project && typeof project === 'object', 'project must be an object');
    const { id, title, description, tags, focus, dates, countries, urls, bilibiliUrl, cover } = project;
    requireValue(nonempty(id) && !ids.has(id), 'project ids must be nonempty and unique');
    ids.add(id);
    requireValue(nonempty(title) && nonempty(description), `${id}: title and description are required`);
    requireValue(Array.isArray(tags) && tags.every(nonempty), `${id}: invalid tags`);
    requireValue(focus && validDate(focus.start) && validDate(focus.end) && focus.start <= focus.end, `${id}: invalid focus interval`);
    requireValue(Array.isArray(dates) && dates.every(validDate), `${id}: invalid event dates`);
    requireValue(Array.isArray(countries) && countries.length > 0 && countries.every(country => country && nonempty(country.code) && nonempty(country.label)), `${id}: invalid countries`);
    requireValue(urls && publicUrl(urls.github) && publicUrl(urls.vercel), `${id}: invalid mirror URLs`);
    if (bilibiliUrl !== null) {
      const url = publicUrl(bilibiliUrl);
      requireValue(url && ['www.bilibili.com', 'bilibili.com'].includes(url.hostname) && /^\/video\/(?:BV[0-9A-Za-z]+|av[0-9]+)\/?$/.test(url.pathname), `${id}: invalid Bilibili video URL`);
    }
    requireValue(cover && nonempty(cover.path) && !cover.path.startsWith('/') && !cover.path.includes('\\') && !cover.path.split('/').some(part => ['..', '.', ''].includes(part)) && !/^[a-z][a-z0-9+.-]*:/i.test(cover.path) && nonempty(cover.alt) && nonempty(cover.caption), `${id}: invalid cover`);
  }
  return catalog;
}

export function filterProjects(projects, { keyword = '', year = '', date = '', country = '' } = {}) {
  const yearText = String(year).trim();
  const dateText = String(date).trim();
  if (yearText && (!/^[0-9]{4}$/.test(yearText) || Number(yearText) < 1)) return [];
  if (dateText && !validDate(dateText)) return [];
  const tokens = String(keyword).trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  const countryCode = String(country).trim();
  return projects.filter(project => {
    const haystack = [project.title, project.description, ...project.tags].join(' ').toLocaleLowerCase();
    if (!tokens.every(token => haystack.includes(token))) return false;
    if (yearText && (yearText < project.focus.start.slice(0, 4) || yearText > project.focus.end.slice(0, 4))) return false;
    if (dateText && !project.dates.includes(dateText)) return false;
    if (countryCode && !project.countries.some(item => item.code === countryCode)) return false;
    return true;
  });
}
