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
 *  Feb 9, 2024 at 12:57:46 PM PST
 */
function localDateString(dateTime) {
  return Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(dateTime));
}

/**
 *  2/9/2024, 12:57:46 PM
 */
function localDateStringNoTz(dateTime) {
  return new Date(dateTime).toLocaleString();
}

function wrapIsoString(isoString, transformer) {
  const span = document.createElement("span");
  span.classList.add("date");
  span.classList.add("localize-iso8601-string");
  span.title = isoString;
  span.textContent = transformer(isoString);
  return span;
}

function localizeIsoStrings(_event) {
  function process(node) {
    if (!node.hasChildNodes()) return;
    const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[-:.T\d]*Z)/g);
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE) {
        process(child); // recurse
        continue;
      }
  
      const nodes = child.textContent
        .split(iso8601)
        .map((segment) => {
          return iso8601.test(segment)
            ? wrapIsoString(segment, localIso8601String)
            : document.createTextNode(segment);
        })
        .filter((i) => i.textContent.length > 0);
      const df = new DocumentFragment();
      nodes.forEach((i) => df.append(i));
      child.replaceWith(df);
    }
  }
  process(document);
}

window.addEventListener("load", localizeIsoStrings);
