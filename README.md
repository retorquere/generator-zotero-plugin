# generator-zotero-plugin

> Generate a Zotero Plugin scaffold

## Installation

First, install [Yeoman](http://yeoman.io) and generator-zotero-plugin using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
npm install -g generator-zotero-plugin
```

Then generate your new project:

```bash
mkdir zotero-my-fantastic-plugin
cd zotero-my-fantastic-plugin
yo zotero-plugin
```

After that:

```bash
npm run build
```
to build

```bash
npm version patch
```

to release a new version (if you are on the main/master branch)

```bash
npm start
```

to start zotero with your plugin loaded (edit `zotero-plugin.ini` first)
