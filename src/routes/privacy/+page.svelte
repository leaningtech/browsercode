<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<div class="bc-page-bg h-full w-full overflow-y-auto text-bc-mist">
	<article class="policy mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-8">
		<a
			href={resolve('/')}
			class="mb-8 inline-block text-[12.5px] text-bc-text-muted no-underline hover:text-bc-link-hover"
			>← Back to BrowserCode</a
		>

		<h1 class="mb-2 font-display text-3xl font-bold tracking-tight text-bc-text sm:text-4xl">
			Privacy Policy
		</h1>
		<p class="mb-10 text-[13px] text-bc-text-muted">Last updated: 13 October 2026</p>

		<p>
			This Privacy Policy explains how Leaning Technologies Limited ("Leaning Technologies", "we",
			"us" and "our") collects, uses, shares and protects information when you use BrowserCode at <code
				>browsercode.io</code
			>, including its agents, its playground IDE and its embeddable view (together, "BrowserCode").
		</p>
		<p>
			BrowserCode runs on BrowserPod, our browser-native code sandbox, which runs Node.js, Rust,
			Python and other full-stack runtimes directly in your browser.
		</p>
		<h2>1. Who We Are</h2>
		<p>
			BrowserCode is operated by Leaning Technologies Limited, a company registered in England and
			Wales under company number 08227826. Our registered office is Nexus, Discovery Way, Leeds,
			England, LS2 3AA. We are the controller of the personal data described in this policy.
		</p>
		<h2>2. BrowserCode in Brief</h2>
		<p>
			BrowserCode runs in your web browser. The code you write, the files you create, the
			repositories you clone and the commands you run are processed inside your browser, not on our
			servers. BrowserCode has no accounts, and we do not receive your code, your prompts to AI
			agents, or the credentials you use to sign in to them.
		</p>
		<p>
			We do receive limited information about how BrowserCode is used, and about the network
			connections BrowserCode makes on your behalf. This policy describes that information.
		</p>
		<h2>3. Information We Collect</h2>
		<h3>Usage information</h3>
		<p>
			When you visit BrowserCode, our hosting provider receives the information your browser sends
			with every request, including your IP address, browser type and language, the page requested,
			the referring page, and the date and time of the request.
		</p>
		<p>
			We measure use of BrowserCode with Plausible Analytics, which we host ourselves. Plausible
			does not use cookies and does not identify you. It records the pages you visit, referring
			pages, links you follow to other websites, and your browser, operating system, device type and
			country. In the playground IDE, the address of the page can include the owner, name, branch
			and folder of a public GitHub repository you open. Plausible also records the following
			events:
		</p>
		<ul>
			<li>which agent you launch, such as Claude Code or Codex CLI;</li>
			<li>which framework template you open in the playground IDE;</li>
			<li>the owner and name of a public GitHub repository you open in the playground IDE; and</li>
			<li>when you open the help menu, start the tour, or open a bug report.</li>
		</ul>
		<p>
			Your IP address is used only to derive your country and to count unique visits within a day,
			and is not stored.
		</p>
		<h3>Logging Information</h3>
		<p>
			BrowserCode starts a BrowserPod environment (a "Pod") in your browser, using BrowserCode's own
			BrowserPod API key. BrowserPod keeps records of Pod network activity so that abuse reports and
			lawful requests about that traffic can be traced. When a Pod connects to an allowed
			third-party service, such as GitHub, the npm registry or an AI provider, and the first time a
			Pod's Portal (see section 6) is accessed from the internet, these records may include:
		</p>
		<ul>
			<li>the API key used, which in BrowserCode is always our own;</li>
			<li>the time or period of the activity, and the number of requests;</li>
			<li>the destination host name;</li>
			<li>the destination IP address and port; and</li>
			<li>the name of the Portal, and when its Pod was started.</li>
		</ul>
		<p>
			These records do not include your IP address, or the path, query string or content of any
			request a Pod makes or receives, or anything a Portal serves. Because every Pod in BrowserCode
			uses our API key, they are not linked to you or to any account of yours.
		</p>
		<p>
			When a Pod starts, BrowserPod counts it against BrowserCode's account. This records nothing
			about you.
		</p>
		<h3>Cookies and third-party content</h3>
		<p>
			BrowserCode does not use cookies, and does not use any analytics or advertising service other
			than Plausible.
		</p>
		<p>
			Icons on every page are loaded from the Iconify API (<code>api.iconify.design</code>, or its
			backup servers <code>api.simplesvg.com</code> and <code>api.unisvg.com</code>). Iconify
			receives your IP address and information about your browser.
		</p>
		<h2>4. Information That Stays in Your Browser</h2>
		<p>
			BrowserCode saves some information in your browser's storage so that your work and settings
			are still there when you come back. This information is not sent to us:
		</p>
		<ul>
			<li>your colour theme, editor settings, and whether you have seen the tour;</li>
			<li>the OpenAI API key you enter to use Codex CLI;</li>
			<li>
				each Pod's files, including your projects, cloned repositories, shell history, and the
				sign-in credentials an agent stores, such as Claude Code's.
			</li>
		</ul>
		<p>
			Anyone with access to your browser profile can read this information. Do not use BrowserCode
			with your own credentials on a shared or public computer. You can remove everything
			BrowserCode has stored by clearing the site data for <code>browsercode.io</code> in your browser
			settings.
		</p>
		<h2>5. Services You Connect To</h2>
		<p>
			Much of what you do in BrowserCode involves services run by others. When you use them, your
			information goes from your browser to that service, under its own terms and privacy policy:
		</p>
		<ul>
			<li>
				<strong>AI providers.</strong> Claude Code sends your prompts, the files it reads and your sign-in
				to Anthropic. Codex CLI sends them, with your OpenAI API key, to OpenAI. These tools may also
				send their own diagnostic data to their providers. We switch off Codex CLI's analytics in the
				configuration BrowserCode provides.
			</li>
			<li>
				<strong>GitHub.</strong> When you open a repository in the playground IDE, your browser asks the
				GitHub API for its contents, and the Pod clones it from GitHub.
			</li>
			<li>
				<strong>Package registries.</strong> Commands such as <code>npm install</code> download packages
				from the npm and yarn registries.
			</li>
			<li>
				<strong>BrowserPod.</strong> Runtime files and disk images are delivered from BrowserPod's servers
				when a Pod starts.
			</li>
		</ul>
		<p>
			We are not responsible for how these services handle your information. Please review their
			privacy policies before you use them.
		</p>
		<h2>6. Portals</h2>
		<p>
			When an app you run in BrowserCode starts a server, BrowserPod gives it a Portal: a public URL
			that routes traffic from the internet to that server, so that you can preview and share your
			app. Anyone with the URL can open it while your Pod is running. Do not serve personal or
			confidential information through a Portal you share.
		</p>
		<h2>7. Bug Reports and Community</h2>
		<p>
			BrowserCode's <strong>Report a bug</strong> links open a new issue on our public GitHub repository,
			pre-filled with the BrowserCode page you were on, the repository you had open, your preview URL,
			the BrowserCode and BrowserPod versions, and your browser's user agent. Nothing is sent until you
			submit the issue on GitHub, and you can edit or remove any of it first. Issues are public, and are
			handled under GitHub's privacy policy. The same applies to anything you post on our Discord server.
		</p>
		<h2>8. BrowserCode on Other Websites</h2>
		<p>
			Other websites can embed BrowserCode in their pages. When they do, the website's own privacy
			policy covers its page, and this policy covers BrowserCode within it.
		</p>
		<h2>9. How We Use Information</h2>
		<p>We use the information we collect to:</p>
		<ul>
			<li>operate, secure and improve BrowserCode;</li>
			<li>
				understand which agents, frameworks and features people use, and decide what to build next;
			</li>
			<li>understand how people discover BrowserCode and BrowserPod;</li>
			<li>
				keep BrowserPod secure and available, investigate suspected misuse, and respond to abuse
				reports and lawful requests about traffic generated through BrowserCode;
			</li>
			<li>respond to bug reports, enquiries and other communications; and</li>
			<li>protect our rights and users, and comply with legal obligations.</li>
		</ul>
		<p>
			We do not use your personal information for automated decision-making that has legal or
			similarly significant effects on you.
		</p>
		<h2>10. Our Lawful Bases</h2>
		<p>Under the UK GDPR, we rely on:</p>
		<ul>
			<li>
				<strong>legitimate interests</strong>, to operate and secure BrowserCode, measure its use
				with Plausible, keep Logging Information, and respond to bug reports and enquiries, where
				those interests are not overridden by your rights; and
			</li>
			<li><strong>legal obligation</strong>, where the law requires us to process information.</li>
		</ul>
		<h2>11. How We Share Information</h2>
		<p>
			We share information only where reasonably necessary for the purposes described above,
			including with:
		</p>
		<ul>
			<li>
				<strong>affiliates and group companies</strong> that help us operate or support BrowserCode and
				BrowserPod;
			</li>
			<li>
				<strong>service providers and subprocessors</strong>, listed in section 12, that host
				BrowserCode and BrowserPod;
			</li>
			<li>
				<strong
					>professional advisers, regulators, courts, law enforcement or other authorities</strong
				> where disclosure is required by law or reasonably necessary to protect rights, property, safety
				or BrowserCode. This may include Logging Information about traffic generated through BrowserCode;
				and
			</li>
			<li>
				<strong>a buyer, successor or other transaction counterparty</strong> if we are involved in a
				merger, acquisition, financing, reorganisation or sale of all or part of our business.
			</li>
		</ul>
		<p>We do not sell your personal information.</p>
		<h2>12. Hosting, Data Location and Subprocessors</h2>
		<p>
			BrowserCode is served through Cloudflare's global infrastructure, at the data centre closest
			to you. Our key subprocessors for BrowserCode currently include:
		</p>
		<ul>
			<li>
				<strong>Cloudflare, Inc.</strong>, which hosts and delivers BrowserCode, and runs the
				BrowserPod infrastructure that relays a Pod's network connections and Portals and stores
				Logging Information. Logging Information is stored in data centres in the European Union.
			</li>
		</ul>
		<p>Plausible Analytics runs on our own infrastructure, hosted in the European Union.</p>
		<p>
			Cloudflare may process personal data outside the United Kingdom. Where personal data is
			transferred internationally, we rely on appropriate safeguards, such as the UK International
			Data Transfer Addendum, Standard Contractual Clauses or UK adequacy regulations.
		</p>
		<h2>13. Data Retention</h2>
		<p>
			We keep personal information only for as long as reasonably necessary for the purposes
			described in this policy, including to resolve disputes, enforce agreements and comply with
			legal obligations. We may continue to use information that has been anonymised or aggregated
			so that it is no longer personal data. More specifically:
		</p>
		<ul>
			<li>Plausible does not store personal data;</li>
			<li>
				Logging Information is kept for twelve (12) months, then deleted, unless the law requires us
				to keep it longer;
			</li>
			<li>
				correspondence with us is kept until one year after your last interaction with us; and
			</li>
			<li>information in your browser's storage stays there until you clear it.</li>
		</ul>
		<h2>14. Your Rights and Choices</h2>
		<p>
			Under the UK GDPR, the Data Protection Act 2018 and other applicable data protection laws, you
			may have the right to:
		</p>
		<ul>
			<li>be informed about how your personal information is used;</li>
			<li>access a copy of the personal information we hold about you;</li>
			<li>have inaccurate or incomplete information corrected;</li>
			<li>have your personal information deleted in certain circumstances;</li>
			<li>restrict processing in certain circumstances;</li>
			<li>object to processing; and</li>
			<li>data portability, where applicable.</li>
		</ul>
		<p>
			To exercise your rights, please contact us at <a href="mailto:privacy@browserpod.io"
				>privacy@browserpod.io</a
			>. If you are not satisfied with our response, you may complain to the UK Information
			Commissioner's Office.
		</p>
		<h2>15. Changes to This Policy</h2>
		<p>
			We may update this Privacy Policy from time to time. When we do, we will update the "Last
			updated" date at the top of this page.
		</p>
		<h2>16. Contact Us</h2>
		<p>
			If you have questions about this Privacy Policy or about how we handle your personal data,
			please contact us at <a href="mailto:privacy@browserpod.io">privacy@browserpod.io</a>.
		</p>
	</article>
</div>

<style>
	.policy h2 {
		margin: 2.5rem 0 0.75rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-bc-text);
	}
	.policy h3 {
		margin: 1.5rem 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-bc-text);
	}
	.policy p,
	.policy li {
		font-size: 14.5px;
		line-height: 1.7;
	}
	.policy p {
		margin-bottom: 0.875rem;
	}
	.policy ul {
		margin: 0 0 0.875rem;
		padding-left: 1.25rem;
		list-style: disc;
	}
	.policy li {
		margin-bottom: 0.375rem;
	}
	.policy strong {
		font-weight: 600;
		color: var(--color-bc-text);
	}
	.policy code {
		font-size: 0.9em;
		color: var(--color-bc-text);
	}
	.policy p a {
		color: var(--color-bc-text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.policy p a:hover {
		color: var(--color-bc-link-hover);
	}
</style>
