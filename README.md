# Foo

This article describes a strategy for clarifying meaning when displaying
times and dates on web pages. Confusion comes primarily thorough
omitting the time zone or using an ambiguous day and month digit order.
This article describes

* Changing web pages after they are loaded,
* Using the DOM to manipulate text not delineated by mark-up, and
* Representing times and dates in web pages.


Imagine you’re looking at a web page presenting an activity log:

    2/8/24 8:03 - Sweep drive
    2/8/24 8:16 - Trim hedge
    2/8/24 8:34 - Take out trash

Morning or evening? Fall or the Winter? British or American? Maybe I’m
an American writing for a British audience. Maybe I’m a conscientious
American writer who has diligently added ‘u’ characters after all the
‘o’ characters, but somehow just forgot to change the day/month order.
Or is it month/day?

Let’s develop and implement a strategy for representing dates in
a software interface where the language is English, but the
audience is global. Here’s the strategy we’re going to use:

* The back-end dev is to write all event time stamps in the HTML in
  coordinated universal time using the W3C datetime format.
* The front-end dev is going to automate the display of the time
  stamps to represent them unambiguously for each local reader.

The backend dev uses the available tool to write the time stamps:

In Ruby:

```ruby
Time.now.utc.strftime("%FT%TZ")
```

In Python:

```python
import datetime
f"{datetime.datetime.utcnow().isoformat()}Z"
```

In Java:

```java
import java.time.*
LocalDateTime.now(ZoneOffset.UTC) + "Z"
```

In JavaScript:

```javascript
new Date().toISOString()
```

The delivered HTML looks something like this:

    <pre>
    2024-02-09T04:03:14Z - Sweep drive
    2024-02-09T04:16:56Z - Trim hedge
    2024-02-09T04:34:22Z - Take out trash
    </pre>

The front-end dev will write JavaScript to scan the page text
for these date stamps and then replace them with an unambiguous
format for the local reader.

The front-end dev starts by adding a function to the page onload
handler so the function `localizeIsoStrings(event)` runs
when the page loads.

```javascript
function localizeIsoStrings(event) {
}

window.addEventListener("load", localizeIsoStrings);
```

We might grumble at the back-end dev for not wrapping
each date stamp in a span to make each one easy to locate.
But we’ll roll with it. We know that
special items on the page need to be identified with
semantic mark-up for both accessibility and presentation.
Since this whole project is about date stamps, it is clearly
special, and when we’re done with it we will have each
date stamp properly wrapped in a span element like this:

```html
<span
  class="date localized-iso8601-string"
  title="2024-02-08T20:03:14Z"
  >Feb 8, 2024 at 08:03:14 PM PST</span>
```

Here’s a function that returns the structure:

```javascript
function wrapIsoString(isoString, transformer) {
  const span = document.createElement("span");
  span.classList.add("date");
  span.classList.add("localize-iso8601-string");
  span.title = isoString;
  span.textContent = transformer(isoString);
  return span;
}
```

This function

* Creates a `span` element.
* Adds a `class` attribute with two classes: one a generic “date” and one
  specific to the project, “localize-iso8601-string“.
* Adds a `title` attribute with its value set to the original datetime
  format. In most modern browsers, readers who hold the mouse cursor over
  an element with a title attribute for about three seconds will see the
  content of the title attribute appear in a pop-up box.
* Calls for the localized version and adds the localized version into
  the element’s text content, which will be immediately visible to
  readers.
* Returns the `span` element.

For the transformation, let’s start with an obvious solution:

```javascript
new Date("2024-02-08T20:03:14Z").toLocaleString();
⬅︎ "2/8/2024, 12:03:14 PM"
```

Wrap it in a function so we can reference it in our program:

```javascript
function localDateString(dateTime) {
  return new Date(dateTime).toLocaleString();
}
```

This function

* Receives the datetime formatted string
* Parses it into a Date object
* Creates a default localized string from the object
* Returns the localized string

Turns out this is not going to do exactly what we need.
The local time zone, which is critical for our solution is missing.
We’ll use it as a placeholder for now and improve it later.

Now, clearly, we’re going to be scanning text for a particular text
pattern. This can be a problem because the text we’re going to be
searching for can have an enourmous variety. Some
people, when confronted with a problem, think “I know, I'll use regular
expressions.” Which is exactly what we’re going to do:

```javascript
const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[:.T\d]*Z)/);
```

This regular expression matches text that is

* Four digits, followed by
* A hyphen, followed by
* Two digits, followed by
* A hyphen, followed by
* Two digits, followed by
* Any number of any of the following characters in any order
  * A colon
  * A decimal point
  * A captital T
  * Any digit zero through 9
* Followed ultimately by a capital Z 

The regular expression also uses parentheses (just inside the forward
slashes that delineates the regular expression) to create a capture
group. This capture group turns out to be essential for our purpose, and
will become clear later on.

Because I just now got a cold chill down my spine realizing that
`querySelectorAll` does not have a polymorph that takes a regular
expression.

The document object model, which front-end devs use to explore
and change HTML pages gives good access to

* HTML elements
* HTML element attributes
* HTML element text content

The DOM does not have tools to exchange a portion of a text node
with an element:



With trepidation, we return to the `localizeIsoStrings(event)` function.
First, we know that we aren’t going to do anything with the event
object that is passed. The JavaScript convention for identifying
a parameter you have to receive, but that you are not going to use
is to prepend it with an underscore:

```javascript
function localizeIsoStrings(_event) {
}
```

Next we know we’re going to walk the DOM, which, as shown in
the illustration, is a tree structure. Turns out, most browsers
support a function called TreeWalker for, well, walking the DOM
tree. Unfortunately, although TreeWalker makes is easy to
retrieve content from various places in your page, it doesn’t
have good support for changing those pieces when you find them.

So, we’ll roll our own walker. The typical pattern for this is
to start with one element, get a list of its children, and process
each child in turn. If any child has children of its own, recurse
into that child and so on till you run out of children.

We know our function `localizeIsoStrings(event)`, then, is really
just basically going to be one line: A call to a recursive
function:

```javascript
function nodeWalker(node) {
}

function localizeIsoStrings(_event) {
  nodeWalker(document.body);
}
```

Since we’re looking for text nodes and since text nodes never have child
nodes, we know when can skip all childless nodes: No text there.

```javascript
function nodeWalker(node) {
  if (!node.hasChildNodes()) return;
}
```

Next, we’ll set up our loop, and insert our regular expression
before it——outside the loop——so we don’t waste time and memory
creating and destroying the regular expression object with
each iteration:

```javascript
function nodeWalker(node) {
  if (!node.hasChildNodes()) return;
  const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[-:.T\d]*Z)/);
  for (const child of node.childNodes) {
  }
}
```

And the first thing we want to do is to start another loop
if the child is an element, which might itself contain text.
Then we want to skip the rest of the loop if the current
node is not, itself, a text node. Add two guard clauses:

```javascript
function nodeWalker(node) {
  if (!node.hasChildNodes()) return;
  const iso8601 = new RegExp(/(\d{4}-\d{2}-\d{2}[:.T\d]*Z)/);
  for (const child of node.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) nodeWalker(child); // recurse
    if (child.nodeType !== Node.TEXT_NODE) continue;
  }
}
```

At this point, the child node is definitely a text node because, if it
wasn’t, we’d have already left the loop. So we will get the text content
of the text node:

```javascript
child.textContent
```

Now we split the string into an array of strings.
We’ll split the string on the pattern of the datetime
string that we’re looking for.

The JavaScript split method takes either a string (or character) or
a regular expression. In typical use, these separators are
discarded:

```javascript
"Fly, you fools!".split("/\s+/");
⬅︎ ▶︎ Array(3) [ "Fly,", "you", "fools!" ]
```

Note how in the above split, the space characters are gone. None of the
strings in the array contain spaces, and if we join the array of strings
back into a single string, it looks wrong:

```javascript
["Fly,", "you", "fools!"].join("");
⬅︎ "Fly,youfools!"
```

However, if you include a capture group in your regular expression by
including parentheses, the split function splits the string at the
beginnings and ends of the group and inserts the match between:

```javascript
"Fly, you fools!".split("/\s+/");
⬅︎ ▶︎ Array(3) [ "Fly,", "you", "fools!" ]
"Fly, you fools!".split("/(\s+)/");
⬅︎ ▶︎ Array(5) [ "Fly,", " ", "you", " ", "fools!" ]
```

As you remember, we wrapped the regular expression we created
to match datetimes in parentheses so when we split on
that regular expression, we get an array of
strings, with zero or more of the strings in the array
exactly matching our datetime pattern.

The next step is to use the `map` method
(of big data map/reduce fame) to evaluate each element
in the array. If the string matches our datetime pattern,
then replace it with our replacement `span` element, else
convert the string back into a text node. Now we have
an array of nodes: zero or more are text nodes,
and zero or more are `span` element nodes.

A final optimization: Filter the resulting array
to remove any text nodes where the length of the
represented string is zero characters long.
The zero-length nodes won’t be visible on the
web page, but there is no point is adding meaningless
nodes to the DOM for the browser to keep track of.

```javascript
"123".split("/(\d+)/");
⬅︎ ▶︎ Array(3) [ "", "123", "" ]
```

I'm going to work all that whole logic into one step
and call the resulting array of nodes, “nodes”:

```javascript
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
          ? wrapIsoString(segment, localIso8601String)
          : document.createTextNode(segment);
      })
      .filter((i) => i.textContent.length > 0);
  }
}
```

Now, we just have to replace the current node with the nodes
stored in our “nodes” array.
The `replaceWith()` method does not accept an array of nodes,
but it does accept a document fragment object.
So, we’ll create a document fragment object,
populate it with the nodes, and
then replace the child with the resulting document fragment:

```javascript
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
```

Note that the the "true” fork of the `map` lambda calls
the `wrapIsoString` function that we wrote earlier.
Also note that the `wrapIsoString` function takes two parameters:
a `isoString` and a `transformer` function.
The `transformer` function we’re calling here is the one
we wrote earlier called `localDateString`.

At this point, our implementation should be functional.
Let’s try it out:

```html
<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<title>Local ISO 8601 Demonstration</title>
</head>
<body>
<h1>Local ISO 8601 Demonstration</h1>
<pre>
2024-02-08T20:03:14Z - Sweep drive
2024-02-08T20:16:56Z - Trim hedge
2024-02-08T20:34:22Z - Take out trash
</pre>
<script src="script.js"></script>
</body>
</html>
```




  * * *

When configuring a server of any sort, set its time zone to “UTC”.

In many Linux distributions, you can determine the current time zone with
this command:

```bash
timedatectl
```

You can list available time zones with this command:

```bash
timedatectl list-timezones
```

You can set your server’s time zone to “UTC” with this command:

```bash
sudo timedatectl set-timezone Etc/UTC
```

