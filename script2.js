function localDateString(dateTime) {
  return Intl.DateTimeFormat(navigator.language, {
    dateStyle: "medium",
    timeStyle: "long",
  }).format(new Date(dateTime))
    .replace(" at", "");
}

function wrapIsoString(isoString, transformer) {
  const span = document.createElement("span");
  span.classList.add("date");
  span.classList.add("localize-iso8601-string");
  span.title = isoString;
  span.textContent = transformer(isoString);
  return span;
}

function nodeWalker(node, re) {
  if (!node.hasChildNodes()) return;
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) nodeWalker(child, re); // recurse
    if (child.nodeType !== Node.TEXT_NODE) continue;
    const nodes = child.textContent
      .split(re)
      .map((segment) => {
        return re.test(segment)
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
  const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[:.T\d]*Z)/);
  nodeWalker(document.body, iso8601);
}

window.addEventListener("load", localizeIsoStrings);
