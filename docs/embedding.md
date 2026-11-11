# Embedding BrowserCode

BrowserCode runs entirely in the browser. An embed is our page inside your iframe.

What your page has to do depends on what the embed runs on:

| Embed                          | Runs on    | Your page must send             | The iframe must carry           |
| ------------------------------ | ---------- | ------------------------------- | ------------------------------- |
| `runtime=cheerpj` (Java)       | CheerpJ    | nothing                         | nothing                         |
| `framework`, `repo` or `agent` | BrowserPod | the two isolation headers below | `allow="cross-origin-isolated"` |

## Java embeds: any page, no headers

CheerpJ does not need cross-origin isolation, so a Java embed is a plain iframe. It runs on any page: a hosted blog or CMS where you cannot set response headers, an ordinary page that loads third-party scripts and images, or a cross-origin isolated page alongside BrowserPod embeds.

```html
<iframe
	src="https://browsercode.io/embed?runtime=cheerpj"
	style="width: 100%; height: 600px; border: 0"
></iframe>
```

## BrowserPod embeds: cross-origin isolation required

BrowserPod needs `SharedArrayBuffer`, which browsers expose only on cross-origin isolated pages. Isolation is inherited from the top-level document, so the embedding page must send both headers itself:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The iframe must carry `allow="cross-origin-isolated"`. Without all three the embed reports that the headers are missing.

```html
<iframe
	src="https://browsercode.io/embed?repo=github.com/sveltejs/kit&view=preview"
	allow="cross-origin-isolated"
	style="width: 100%; height: 600px; border: 0"
></iframe>
```

`require-corp` blocks cross-origin resources on your page that do not send `Cross-Origin-Resource-Policy` or use CORS. If your page cannot accept that, or cannot set headers at all, only Java embeds will run on it.

## API key

Pass your own BrowserPod API key as `apiKey`, after whitelisting your domain for it in the [BrowserPod console](https://console.browserpod.io/keys):

```
/embed?framework=vite&view=preview&apiKey=<your key>
```

The key is visible in your page's source. The domain whitelist is what keeps others from using it.

Without `apiKey` the embed boots with no key, and reaches nothing but the npm registry:

- A `framework` template still installs and runs, but has no live preview. The preview pane says so.
- `repo` and `agent` embeds need a key to clone or to reach the agent's API. Without one they show a message instead of booting.

Java embeds (`runtime=cheerpj`) do not use BrowserPod and ignore `apiKey`.

## Parameters

| Parameter   | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| `repo`      | Any GitHub URL or `owner/repo`, optionally `.../tree/<ref>/<dir>`             |
| `framework` | A template id (`vite`, `react`, `svelte`, `vue`, `nextjs`, `nuxt`, `express`) |
| `agent`     | A CLI agent id (`claude`, `codex`, `pi`)                                      |
| `runtime`   | `cheerpj`, for a Java project compiled and run in the browser by CheerpJ      |
| `view`      | Comma separated: `files`, `search`, `editor`, `terminal`, `preview`           |
| `apiKey`    | Your BrowserPod API key, whitelisted for your domain. See **API key**         |

## Behaviour

- Pass one of `agent`, `runtime`, `repo` or `framework`. With none, the default template boots. With `runtime`, `framework` names one of that runtime's templates, and its first when left out. For `cheerpj` those are the Java examples: `helloworld` and `swing`, also known by their ids `java` and `java-swing`. A shared project link's hash takes the place of `framework`: `/embed?runtime=cheerpj#<project>` boots that project.
- `view` defaults to every pane.
- Agents are terminal first, so `view` only decides whether the preview pane comes with it.
- One agent session per browser. A second embed of the same agent, or the same agent open in another tab, shows the duplicate session dialog.
- `codex` asks for an OpenAI API key inside the frame.
- `claude` opens a new tab for OAuth sign-in.
- `pi` installs from npm on its first launch and signs in through its own `/login`.
- Controls without meaning are omitted: a preview-only embed has no hide button and no port badge.
- Narrower than 768px — which a column in a blog post often is, desktop or not — the panes become tabs. An embed opens on the preview whenever `view` includes it, since a running app says what this is better than an editor does.
- A tab marks itself when its own pane does something you cannot see from the one you are on: the terminal on new output, the preview once a dev server answers. Opening that tab clears the mark.
- Every embed carries a BrowserCode badge linking back to browsercode.io. It sits in the top bar when the embed shows the editor, and floats in the bottom-right corner otherwise.
- `runtime=cheerpj` compiles every `.java` file with `javac` and runs the project's main class: the one the example or shared project link names, or else the only compiled class with a `main` method. When several have one, a picker beside Run chooses, and Share keeps the choice. `javac` runs with `-Xlint`, and its errors and warnings mark the editor at their line and column until the next build. The Output tab is the program's console: typing feeds `System.in` and Ctrl+D ends it, and its Run button builds and runs again. The preview pane is a Display where AWT and Swing windows draw, showing a placeholder until a window opens; a new run clears it. There is no shell. Narrower than 768px, the embed opens on Output rather than the Display.
- Java runs in one BrowserCode tab or embed at a time, because they all share one storage area. A second Java embed on the same page, or one opened while a browsercode.io tab runs Java, shows a dialog instead. Browsers keep each site's embeds apart, so Java embeds on different sites don't conflict.
- Share copies a link that reopens the project. Chrome and Edge allow copying from an iframe only when it carries `allow="clipboard-write"`; without it, Share reports that the copy failed.

## Examples

```
/embed?repo=https://github.com/user/repo/tree/main/examples/demo
/embed?framework=vite&view=preview
/embed?framework=nextjs&view=files,editor,terminal
/embed?agent=claude
/embed?agent=codex&view=terminal
/embed?runtime=cheerpj
/embed?runtime=cheerpj&framework=helloworld
/embed?runtime=cheerpj&view=editor,terminal
/embed?runtime=cheerpj&framework=swing
/embed?runtime=cheerpj#N4IgLglmA2CmIC4QgDQgGYTgZ0QbVAAcBDMAC0RAFliIA7AOgCtiA3Y1EAYwHs6xY-SiS4BrYgHNYAAgAmsALY8A3AB066rtGLZs0mvWnB1qsIQCuAI2gQu07GFK3prHhFnSFtOgAoAymAATvQSeAC60sSBEtgAlEYmYKZ+AJ4Oigw85mAMhMH80L6qIAASsNDQPCjSAOo8gdCyAITFsWoaYAC+6t10IJ1hnUA
```
