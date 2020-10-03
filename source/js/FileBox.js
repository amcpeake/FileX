class FileBox {
	static get target() { return document.querySelector("#top"); }
	
	static get url() { return FileBox.current.url; }
	static get prettyURL() { return FileBox.current.prettyURL; }
	static get files() { return FileBox.current.files; }
	static get element() { return FileBox.current.element; }
	static get callback() { return FileBox.current.callback; }
	static setCallback(callback, once = true) {
		if (once) {
			let oldcall = FileBox.current.callback;
			callback = (file) => {
				callback(file);
				FileBox.current.callback = oldcall;
			}
		}

		FileBox.current.callback = callback;
	}

	constructor(url) {
	        this.url = url;
		this.prettyURL = decodeURIComponent(this.url);
		this.callback = (file) => MediaBox.play(file);
	}

	static async spawn(url = "/files/") {
		if (url.substr(-1) != '/') { // Path to file, remove last part
			url = url.substring(0, url.lastIndexOf("/") + 1);
		}
		if (!/^\/files\//.test(url)) { // Not in /files/
			return false;
		}
		
		let box = null;
		if (await sendRequest(url, {method: 'HEAD'})) { // Validate URL first (i.e. cookie points to deleted directory);
			box = new FileBox(url);
		} else {
			box = new FileBox('/files/');
		}

		let page = await fetchPage(box.url);
		box.files = Array.from(page.querySelectorAll("ul > li > a")).filter((a) => {
			return !(a.href.substr(-1) === '/' && a.getAttribute("href") === '/'); // Do not include "/files/"
		}).map((a) => {
			if (Array.prototype.indexOf.call(a.parentNode.parentNode.childNodes, a.parentNode) === 0) {
				let info = new FileInfo(a.getAttribute("href"));
				info.filename = "Parent Directory";
				return info;
			} else {
				return new FileInfo(box.url + a.getAttribute("href"));
			}
		});


		if (FileBox.current) {
			FileBox.target.replaceChild(await box.generate(), FileBox.element);
		} else {
			FileBox.target.prepend(await box.generate());
		}

		box.element = FileBox.target.firstElementChild;
		

		FileBox.current = box;
		setCookie("FileBox", this.url);
	}

	static refresh() {
		FileBox.spawn(FileBox.url);
	}

	async generate() { // Return HTML with populated elements
		return await this.populate(await this.render());
	}

	
	async populate(render) {
		// Open simulcast
		render.querySelector("i[data-action='simulcast']").addEventListener("click", function() {
			MediaBox.spawn(null, 1);
		});

		// Play from URL
		render.querySelector("i[data-action='play']").addEventListener("click", async function() {
			MediaBox.spawn(new FileInfo(prompt("URL to play")));
		});

		// Download from URL
		
		// Refresh
		render.querySelector("i[data-action='refresh']").addEventListener("click", async function() {
			FileBox.refresh();
		});

		// Add folder
		render.querySelector("i[data-action='addfolder'").addEventListener("click", async function() {
			let path = prompt(`New subfolder of ${FileBox.url}:`);
			if (path == null || path == "") {
				return;
			}
			path = FileBox.url.replace(/^\/files\//,'') + path;
			path = path.replace(/\./g, '');
						
			if (await sendRequest("source/php/addfolder.php", {method: 'POST', body: {path: path}})) {
				FileBox.spawn("/files/" + path);
			} else {
				alert("Failed to create folder");
			}
		});

		// Upload files
		render.querySelector("i[data-action='uploadfile'").addEventListener("click", async function() {
			this.parentNode.querySelector("input").click();
		});
		render.querySelector("input").addEventListener("change", async function() {
			UploadBox.add(Array.from(this.files).map((file) => new FileInfo(file)));
		});

		// Search
		render.querySelector("i[data-action='search'").addEventListener("click", async function() {
			SearchBox.spawn();
		});

		
		// Info
		let fsInfo = async function() {
			let json = await sendRequest("/source/php/diskspace.php", {method: 'POST', callback: (response) => response.json()});
			return `Used: ${formatBytes(json['used'], 2)}\nFree: ${formatBytes(json['free'], 2)}\nTotal: ${formatBytes(json['total'],2)}`;
		}

		fsInfo = await fsInfo();
		render.querySelector("i[data-action='info'").setAttribute("title", fsInfo);
		render.querySelector("i[data-action='info'").addEventListener("click", function() {
			alert(fsInfo);
		});


		this.files.forEach(async (file) => this.populateLine(file, render));
		
		return render;
	}

	async populateLine(file, render) {
		let row = render.querySelectorAll("tbody tr")[this.files.indexOf(file)];
		let a = row.querySelector("a");
		
		// Clicking row
		row.addEventListener("click", function() {
			if (file.type == "directory") {
				FileBox.spawn(file.url);
			} else {
				FileBox.callback(file);
			}
		});

		// Delete button
		row.querySelector("i[data-action='delete']").addEventListener("click", async function(e) {
			e.stopPropagation();

			if (confirm(`Delete ${file.filename}?`) 
				&& await sendRequest("source/php/delete.php", {method: 'POST', body: {path: file.path}})) {
				FileBox.refresh();
			} else {
				alert("Failed to delete file");
			}
		});

		// Add to playlist
		row.querySelector("i[data-action='playlist']").addEventListener("click", async function(e) {
			e.stopPropagation();

			if (file.type == "directory") {
				let page = await fetchPage(file.url);
				PlaylistBox.add(Array.from(page.querySelectorAll("ul > li > a")).filter((a) =>
					a.href.substr(-1) !== '/' // Do not include folders
				).map((a) =>
					new FileInfo(file.url + a.getAttribute("href"))
				).filter(async (file) => {
					let MIME = await file.getType();
					return MIME.includes("audio") || MIME.includes("video");
				}));
			} else {
				PlaylistBox.add(file);
			}
		});

		// Copy button
		row.querySelector("i[data-action='copy']").addEventListener("click", async function(e) {
			e.stopPropagation();

			await navigator.clipboard.writeText(file.url);
		});

		// Rename button
		row.querySelector("i[data-action='rename']").addEventListener("click", async function(e) {
			e.stopPropagation();

			let input = row.querySelector("input[type='text']");
			if (input) { // Submit
				// If no change, don't send or reload
				if (file.path != input.value) {
					if (confirm(`Move ${file.path} to ${input.value}?`)) {
						if (await sendRequest("source/php/rename.php", {method: 'POST', 
							body: {oldpath: file.path, newpath: input.value}}
						)) {
							FileBox.spawn(input.value);
							return;
						} else {
							alert("Failed to move file");
						}
					}
				}
				input.parentNode.replaceChild(a, input);
			} else {
				input = getTemplate(`<input type="text" value="${file.path}">`).querySelector("input");
				input.addEventListener("click", function(event) {
					event.stopPropagation();
				});
				input.addEventListener("keydown", function(event) {
					if (event.which == 13 || event.keyCode == 13 || event.key == 13) {
						this.click();
					} else if (event.which == 27 || event.keyCode == 27 || event.key == 27) {
						event.target.parentNode.replaceChild(a, event.target);	
					}
				}.bind(this));
				
				a.parentNode.replaceChild(input, a);
			}
		});

		// Download button
		row.querySelector("i[data-action='download']").addEventListener("click", async function(e) {
			e.stopPropagation();

			if (file.type == "directory") {

			} else {
				this.nextElementSibling.click();
			}
		});

		// Info button
		let fileInfo = async function() {
			if (file.type == "directory") {
				return `File Path: ${file.path}\nType: Directory`;
			} else {
				let info = `File Path: ${file.path}\nType: ${await file.getType()}\nSize: ${formatBytes(await file.getSize())}\n`;
				let tags = await file.getTags();
				if (tags) {
					info += Object.entries(tags).filter((entry) => typeof(entry[1]) == "string")
						.map((entry) => `${entry[0]}: ${entry[1]}`).join('\n');
				}
				return info;
			}
		};

		fileInfo = await fileInfo();
		row.querySelector("i[data-action='info']").setAttribute("title", fileInfo);
		row.querySelector("i[data-action='info']").addEventListener("click", (e) => { e.stopPropagation(); alert(fileInfo); });

	}

	
	async render() { // Create base HTML
		return getTemplate(`
		<table id="fileBox" class="bordered">
			<thead>
				<tr>
					<td class="bordered">
						<h1 title="${this.prettyURL}">${this.prettyURL}</h1>
					</td>
					<td class="bordered">
						<span class="icons">
							<i title="Open simulcast" class="material-icons" data-action="simulcast">leak_add</i>
							<i title="Refresh directory" class="material-icons" data-action="refresh">refresh</i>
							<i title="Play from URL" class="material-icons" data-action="play">play_circle_outline</i>
							<i title="Add folder" class="material-icons" data-action="addfolder">create_new_folder</i>
							<input type="file" id="fileupload" style="display: none" multiple>
							<i title="Upload file(s)" class="material-icons" data-action="uploadfile">file_upload</i>
							<i title="Search" class="material-icons" data-action="search">search</i>
							<i title="Download from URL" class="material-icons" data-action="download">file_download</i>
							<i class="material-icons" data-action="info">info_outline</i>
						</span>
					</td>
				</tr>
			</thead>
			<tbody id="files">
				${this.files.map((file) => this.renderLine(file)).join('\n')}
			</tbody>
		</table>
		`).cloneNode(true);
	}

	renderLine(file) {
		return `
		<tr>
			<td>
				<i class="material-icons">${file.type == "directory" ? 'folder' : 'insert_drive_file'}</i>
				<a title="${file.filename}">${file.filename}</a>
			</td>
			<td>
				<span class="icons">
					<i title="Delete file" class="material-icons" data-action="delete">delete</i>
					<i title="Add to playlist" class="material-icons" data-action="playlist">queue</i>
					<i title="Copy URL" class="material-icons" data-action="copy">content_copy</i>
					<i title="Move file" class="material-icons" data-action="rename">edit</i>
					<i title="Download file" class="material-icons" data-action="download">file_download</i>
					<a style="display: none" download="${file.filename}" href="${file.url}"></a>
					<i class="material-icons" data-action="info">info_outline</i>
				</span>
			</td>
		</tr>
		`;
	}
}


