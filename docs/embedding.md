# Embedding BrowserCode

BrowserCode runs entirely in the browser. An embed is our page inside your iframe.

```html
<iframe
	src="https://browsercode.io/embed?repo=github.com/sveltejs/kit&view=preview"
	allow="cross-origin-isolated"
	style="width: 100%; height: 600px; border: 0"
></iframe>
```

## Required headers

BrowserPod needs `SharedArrayBuffer`, which browsers expose only on cross-origin isolated pages. Isolation is inherited from the top-level document, so the embedding page must send both headers itself:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The iframe must carry `allow="cross-origin-isolated"`. Without all three the embed reports that the headers are missing.

`require-corp` blocks cross-origin resources on your page that do not send `Cross-Origin-Resource-Policy` or use CORS.

## Parameters

| Parameter   | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| `repo`      | Any GitHub URL or `owner/repo`, optionally `.../tree/<ref>/<dir>`             |
| `framework` | A template id (`vite`, `react`, `svelte`, `vue`, `nextjs`, `nuxt`, `express`) |
| `agent`     | A CLI agent id (`claude`, `codex`, `pi`)                                      |
| `runtime`   | `cheerpj`, for a Java project compiled and run in the browser by CheerpJ      |
| `view`      | Comma separated: `files`, `search`, `editor`, `terminal`, `preview`           |

## Behaviour

- Pass one of `agent`, `runtime`, `repo` or `framework`. With none, the default template boots. With `runtime`, `framework` names a Java example instead: `helloworld`, the default.
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
- `runtime=cheerpj` compiles every `.java` file with `javac` and runs the `Main` class. The Output tab is the program's console: typing feeds `System.in` and Ctrl+D ends it, and its Run button builds and runs again. There is no preview, so `view=preview` is ignored, and no shell.
- Each run starts a new program, while earlier ones may still be running.

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
```
