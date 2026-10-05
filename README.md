# What's new in JupyterLab 4.6 and the tooling behind it: prototype, lint, build, test

Slides, data and sources for the talk by [Mike Krassowski](https://github.com/krassowski) (OpenTeams) at the Jupyter Mini Summit.

**Slides:** [krassowski.github.io/mini-summit](https://krassowski.github.io/mini-summit/) in the browser, or [`slides/dist/talk.html`](slides/dist/talk.html) to download (one file that works offline), or the PDF in [dark](slides/dist/talk.pdf) and [light](slides/dist/talk-light.pdf) versions.

## Abstract

> JupyterLab 4.6 was one of the largest minor releases with the new features propagating to Jupyter Notebook 7.6 and JupyterLite 0.8. This session will first highlight a few new features and enhancements, highlighting what those mean for users and extension authors, and then turns to the four Jupyter Foundation-funded projects that enabled the higher than before pace: jupyter-builder, @jupyter/eslint-plugin, revamped UI tests, and plugin playground. The tooling and principles behind it are reusable and might be of interest to audience behind the Jupyter ecosystem.

## The talk in five points

- JupyterLab 4.6 brought 68 new features and enhancements, 97 bug fixes, 38 documentation improvements and a record 171 maintenance tasks, from 95 contributors (39 of them first-time). The same changes reach Notebook 7.6 and JupyterLite 0.8.
- Writing code got cheap. Of the 4.6 pull requests that answered the AI question in the pull request template, 87 of 168 (52%) said AI generated some of the content. Since 4.6.0 it is 87 of 106 (82%).
- What did not get cheaper is prototyping, reviewing, building and testing. Four proposals funded by the Jupyter Foundation, and delivered by OpenTeams and Quansight, each shorten one of these steps before a person has to look at the change.
- A convention written in AGENTS.md can be skipped silently; a lint rule fails with the file, the line and the fix. Tests that give the same result on a laptop as on CI, in 15 minutes, are what a developer working with an agent needs.
- All of it is reusable outside Jupyter: the GitHub actions for Playwright reports, the approach to stable screenshots, and the idea of encoding review comments as lint rules.

## The four projects

| Step | Project | What it gives you | Get it |
| --- | --- | --- | --- |
| Prototype | [Plugin Playground](https://github.com/jupyterlab/plugin-playground) 1.0 | Write a JupyterLab plugin in the browser, load it without a build, get help from AI, share it as a link, export it as a wheel or a zip. Runs in JupyterLite and on Binder. | `pip install jupyterlab-plugin-playground` |
| Lint | [@jupyter/eslint-plugin](https://github.com/jupyterlab/eslint-plugin) 1.3 | 23 rules for mistakes that TypeScript cannot see: plugin structure, translations, memory leaks, UI tests, startup time. On by default in the extension template. | `jlpm add -D @jupyter/eslint-plugin` |
| Build | [jupyter-builder](https://github.com/jupyterlab/jupyter-builder) 1.2 | Build extensions without installing JupyterLab, with Rspack. Build fixes ship on their own schedule. | `pip install jupyter-builder` |
| Test | [JupyterLab UI tests](https://github.com/jupyterlab/jupyterlab/tree/main/galata) | A full run takes 15 minutes instead of 55, gives the same pixels on a laptop as on CI, updates reference images on a comment, and shows the report in the browser. | Actions in [jupyterlab/maintainer-tools](https://github.com/jupyterlab/maintainer-tools) |

## For the Jupyter Foundation

The four proposals of the first funding round (2025) that OpenTeams and Quansight delivered together. Progress reports: [jupyter-governance.github.io/funding-proposals](https://jupyter-governance.github.io/funding-proposals/).

- **Improve visual regression testing** ([jupyter-governance/funding-proposals#7](https://github.com/jupyter-governance/funding-proposals/issues/7)): six shards per browser cut the run from 55 to 15 minutes; any contributor can request new reference images; pinned fonts make a local run match CI; a badge links each pull request to its report. Flaky tests per scheduled run went from 17 in January to 2.4 in August 2026, and fixing them found 19 bugs in JupyterLab, all fixed.
- **Plugin Playground** ([jupyter-governance/funding-proposals#8](https://github.com/jupyter-governance/funding-proposals/issues/8)): version 1.0 (May 2026) with AI assistance through `jupyterlite/ai`, a JupyterLite deployment, sharing and export. The stretch goal, code intelligence (LSP) in JupyterLite, waits on upstream releases.
- **Finish the build system separation** ([jupyter-governance/funding-proposals#9](https://github.com/jupyter-governance/funding-proposals/issues/9)): jupyter-builder 1.0 (May 2026) to 1.2, used by JupyterLab, Notebook and the extension template. When the move to Rspack 2.0 broke extensions, a builder release fixed it within 24 hours, without a JupyterLab release.
- **Custom linting** ([jupyter-governance/funding-proposals#11](https://github.com/jupyter-governance/funding-proposals/issues/11)): @jupyter/eslint-plugin 1.0 (May 2026) to 1.3 with 23 rules, in the extension template and adopted by several Jupyter projects; JupyterLab itself gained stricter linting (spell checking, workflow security checks, no explicit `any`).

## Further reading

On the Jupyter blog:

- [JupyterLab 4.6 and Notebook 7.6 are out!](https://blog.jupyter.org/posts/2026/jupyterlab-4-6-and-notebook-7-6-are-out/), Michał Krassowski, 2 July 2026
- [A User's Journey with Plugin Playground: From First Idea to Installable JupyterLab Extension](https://blog.jupyter.org/posts/2026/a-users-journey-with-plugin-playground-from-first-idea/), Anuj Singh, 28 May 2026
- [Catching Jupyter-specific bugs before CI does: announcing jupyter eslint plugin](https://blog.jupyter.org/posts/2026/catching-jupyter-specific-bugs-before-ci-does/), Darshan Paudyal, 11 June 2026
- [Announcing jupyter-builder: A Standalone Build System for JupyterLab Extensions](https://blog.jupyter.org/posts/2026/announcing-jupyter-builder-a-standalone-build-system/), Darshan Paudyal, 19 June 2026

On the OpenTeams engineering blog:

- [Plugin Playground AI Integration for Faster Plugin Prototyping](https://openteams.com/plugin-playground-ai-integration/), Anuj Singh, 24 April 2026
- [Your AI Agent Ignored AGENTS.md. Your Linter Won't Let It.](https://openteams.com/lint-rules-for-ai-agents/), Darshan Paudyal, 1 October 2026
- [Reliable Visual Regression Testing for Humans and Coding Agents](https://openteams.com/visual-regression-testing-jupyterlab/), Mike Krassowski

## Data behind the numbers

- [`sources/release-stats/`](sources/release-stats/README.md): AI usage in JupyterLab pull requests by release and by month, with the method. [`tools/ai_usage.py`](tools/ai_usage.py) recomputes it from the changelog and the pull request descriptions.

## Thanks

The **Jupyter Foundation** funded the four proposals. **OpenTeams** and **Quansight** delivered them together, and OpenTeams paid for the travel to the summit. The **community** reviewed, triaged, tested and adopted the work.

- Built by [Anuj Singh](https://github.com/MUFFANUJ), [Darshan Paudyal](https://github.com/Darshan808) and [Mike Krassowski](https://github.com/krassowski) (OpenTeams).
- Advice and support from Quansight: [Smera Goel](https://github.com/smeragoel), [Matthias Bussonnier](https://github.com/Carreau) and [Tania Allard](https://github.com/trallard).
- Administrative support from Erika Oliphant (OpenTeams) and Ashley Baal (Quansight).
- Reviews and feedback from [Jeremy Tuloup](https://github.com/jtpio), [Nicolas Brichet](https://github.com/brichet), [Nicholas Bollweg](https://github.com/bollwyvl), [Jason Grout](https://github.com/jasongrout), [Yann Pellegrini](https://github.com/Yann-P), [Florence Haudin](https://github.com/HaudinFlorence), [Matt Fisher](https://github.com/mfisher87) and [Frédéric Collonval](https://github.com/fcollonval).
- jupyter-builder was started in Google Summer of Code 2024 by [Ronan Coutinho](https://github.com/cronan03), mentored by Frédéric Collonval.
- The weekly triage group, including [@RRosio](https://github.com/RRosio), [Andrii Ieroshenko](https://github.com/andrii-i), [Rodrigo Silva Ferreira](https://github.com/rodrigosf672) and [Konstantin Taletskiy](https://github.com/ktaletsk), and the [95 contributors to JupyterLab 4.6](https://github.com/jupyterlab/jupyterlab/releases/tag/v4.6.0).

## Credits for bundled assets

- Fonts: Source Sans 3 and Source Code Pro (Adobe), DejaVu Sans and DejaVu Sans Mono (through `@fontsource`), all under the SIL Open Font License; licence texts in `slides/assets/fonts/`.
- Icons: [Lucide](https://lucide.dev) (ISC) and JupyterLab's icons (BSD-3-Clause).
- Logos of the Jupyter Foundation, OpenTeams and Quansight are trademarks of their owners; sources in `slides/assets/img/logos/SOURCES.md`. Cover images belong to the blogs that published the posts.
