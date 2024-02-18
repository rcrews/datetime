function localDateString(dateTime) {
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

function nodeWalker(node) {
  if (!node.hasChildNodes()) return;
  const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[:.T\d]*Z)/);
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) nodeWalker(child); // recurse
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const nodes = child.textContent
      .split(iso8601)
      .map((segment) => {
        return iso8601.test(segment)
          ? wrapIsoString(segment, localDateString)
          : document.createTextNode(segment);
      })
      .filter((i) => i.textContent.length > 0);
    const df = new DocumentFragment();
    nodes.forEach((i) => df.append(i));
    child.replaceWith(df);
  }
}

function localizeIsoStrings(_event) {
  nodeWalker(document.body);
}

window.addEventListener("load", localizeIsoStrings);
