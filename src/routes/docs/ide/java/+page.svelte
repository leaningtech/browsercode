<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<p>
	Java does not run on BrowserPod like everything else here. It is compiled and run by
	<a href="https://cheerpj.com" target="_blank" rel="noopener noreferrer">CheerpJ</a>, a JVM that
	runs in the browser, which has one happy consequence: Java projects need none of the modern
	browser features the rest of BrowserCode depends on. They work on phones, on iPads, and in
	browsers where a Node.js project would refuse to start.
</p>
<p>
	Start from the <a href="{resolve('/ide')}?lang=java">Java tab of the picker</a>, which has a plain
	<a href="{resolve('/java')}?example=helloworld">Hello World</a>
	and a
	<a href="{resolve('/java')}?example=swing">Swing example</a>.
</p>

<h2>Choosing a Java version</h2>

<p>
	The header switches between Java 8, 11, 17, 21 and 25, and the examples start on 25. If you have
	not edited anything yet, switching version also swaps the starter for one that compiles there,
	since the Hello World example uses syntax that only exists in Java 25. Once you have made an edit
	your code is left alone, so a version switch after that is yours to deal with.
</p>

<h2>Running your code</h2>

<p>
	Run compiles every <code>.java</code> file in the project and then starts it. Compiler errors and warnings
	appear in the editor on the line and column they refer to, and stay until the next build.
</p>
<p>
	If exactly one class has a <code>main</code> method, that is the one that runs. If several do, a picker
	appears next to Run so you can say which, and that choice is remembered in a shared link.
</p>

<h2>Console and windows</h2>

<p>
	The Output tab is a working terminal, running client side like everything else here. Typing into
	it feeds <code>System.in</code>, so programs that read input behave normally, and Ctrl+D ends the
	stream.
</p>
<p>
	Where other projects show a web preview, a Java project shows a Display, which is where AWT and
	Swing windows draw. It stays empty until your program opens a window, and clears on each run.
</p>

<div class="docs-note">
	<p>
		There is no shell for Java projects yet, and no package manager, so the standard library is what
		you have for now. Dependency support is on the way.
	</p>
</div>

<h2>Sharing a project</h2>

<p>
	Share puts the entire project into a link: the files, the Java version and the chosen main class,
	all compressed into the URL itself. No server stores anything, so the link keeps working as long
	as the recipient can open browsercode.io.
</p>

<div class="docs-note">
	<p>
		Because the project travels inside the URL, a big project makes a very long link. If one stops
		working when pasted somewhere, it has probably hit that tool's URL length limit.
	</p>
</div>

<p>
	To point at one of the stock examples rather than your own code, or to put a link in a README, see <a
		href={resolve('/docs/linking')}>Linking to BrowserCode</a
	>.
</p>

<h2>One Java project at a time</h2>

<p>
	Java tabs share a single storage area, so a second one offers to take the session over rather than
	starting its own, and accepting closes it in the first tab. Browsers keep sites apart, so Java
	embeds on different sites never conflict. Embeds are covered in <a
		href={resolve('/docs/embedding')}>Embedding BrowserCode</a
	>.
</p>
