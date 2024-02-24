/**
 * Converts a string representing a date and time into a
 * string representing the same date and time in a format
 * natural to the local reader.
 * @param {string} dateTime - A string representing a date.
 * @returns {string} A string representing a date.
 */
function localDateString(dateTime) {
  return Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(dateTime))
    .replace("\x20at", "");
}

/**
 * Converts a string representing a date and time into a
 * string representing the same date and time in a format
 * adhering to ISO 8601.
 * @param {string} dateTime - A string representing a date.
 * @returns {string} A localized ISO 8601 date string.
 */
function localIso8601String(dateTime) {
  const idtf = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "longOffset",
  });
  const parts = idtf.formatToParts(new Date(dateTime));
  const mf = new Map();
  parts.forEach((p) => mf.set(p.type, p.value));
  return [
    mf.get("year"),
    "-",
    mf.get("month"),
    "-",
    mf.get("day"),
    "T",
    mf.get("hour"),
    ":",
    mf.get("minute"),
    ":",
    mf.get("second"),
    mf.get("timeZoneName").replace(/[^-+:\d]+/, ""),
  ].join("");
}

/**
 * An event listener intended to be run after page-load.
 * It scans the page for text matching ISO 8601 datestamps
 * that use 'Z' as the time zone.
 * @param {event} _event - The event.
 */
function localizeIsoStrings(_event) {
  const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[:.T\d]*Z)/);
  nodeWalker(document.body, iso8601);
}

/**
 * Recursively traverses a node tree, replacing identified
 * text segments with HTMLElement nodes.
 * @param {Node} node - A DOM node.
 * @param {RegExp} re - A pattern to identify the text to replace.
 */
function nodeWalker(node, re) {
  if (!node.hasChildNodes()) return;
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) nodeWalker(child, re);
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const nodes = child.textContent
      .split(re)
      .map((segment) => {
        return re.test(segment)
          ? wrapIsoString(segment, localIso8601String)
          : document.createTextNode(segment);
      })
      .filter((i) => i.textContent.length > 0);
    const df = new DocumentFragment();
    nodes.forEach((i) => df.append(i));
    child.replaceWith(df);
  }
}

/**
 * Returns an HTMLElement suitable to be a child of an
 * HTMLElement that contains text. In CSS-speak, an
 * in-line element.
 * @param {string} dateTime - A string representing a date.
 * @param {function} transformer - Converts one string to another.
 * @returns {HTMLElement} An HTMLElement.
 */
function wrapIsoString(isoString, transformer) {
  const span = document.createElement("span");
  span.classList.add("date");
  span.classList.add("localize-iso8601-string");
  span.title = isoString;
  span.textContent = transformer(isoString);
  return span;
}

window.addEventListener("load", localizeIsoStrings);
