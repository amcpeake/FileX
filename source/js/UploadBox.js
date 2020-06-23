class UploadBox {
	static get target() { return document.querySelector("#top"); }
	
	static get files() { return UploadBox.current.files; }
	static set files(files) { UploadBox.current.files = files; }
	static get element() { return UploadBox.current.element; }
	
	constructor(files) {
	        this.files = files;
	}

	static async spawn(files) {
		if (!files.length) {
			return false;
		}
		
		let box = new UploadBox(files);
		if (UploadBox.current) {
			UploadBox.target.replaceChild(await box.generate(), UploadBox.element);
		} else {
			UploadBox.target.append(await box.generate());
		}

		box.element = UploadBox.target.lastElementChild;
		UploadBox.current = box;
	}
	
	static async add(files) { // Add one or more files
		if (UploadBox.current) {
			UploadBox.element.querySelector("tbody").insertBefore(
				getTemplate(files.map(file => UploadBox.renderLine(file)).join('\n')), 
				UploadBox.element.querySelector("tbody tr:last-child"));	
			UploadBox.files = UploadBox.files.concat(files);
		} else {
			UploadBox.spawn(files);
		}
	}

	static refresh() {
		UploadBox.spawn(UploadBox.files);
	}

	static remove() {
		UploadBox.element.remove();
		UploadBox.current = null;
	}

	async generate() { // Return HTML with populated elements
		return await this.populate(await this.render());
	}

	async populate(render) {
		// Box info
		let filesInfo = `File Count: ${this.files.length}\nTotal size: ${formatBytes(this.files.reduce((size,file) => size + file.size, 0))}`;
		
		render.querySelector("i[data-action='info']").setAttribute("title", filesInfo);
		render.querySelector("i[data-action='info']").addEventListener("click", () => alert(filesInfo));

		// Close box	
		render.querySelector("i[data-action='close']").addEventListener("click", async function() {
			UploadBox.remove();
		});
		
		// Upload button
		render.querySelector("a[data-action='upload']").addEventListener("click", async function() {
			if (this.parentNode.querySelector("progress")) { // Upload is occuring
				return;
			}
			
			let progress = document.createElement("progress"); // Create progress bar, thereby locking the upload
			let pout = document.createElement("a"); // Progess percentage output
			this.nextElementSibling.appendChild(pout);
			this.nextElementSibling.appendChild(progress);
			
			let formData = new FormData();

			Object.entries(UploadBox.files).forEach(([key, file]) => {
				if (document.querySelectorAll("#uploadBox tbody  tr")[key].querySelector("input[type='text']")) {
					document.querySelectorAll("#uploadBox i[data-action='rename']")[key].click();
				}
				console.log(file.path);
				formData.append("file[]", file.file);
				formData.append("paths[]", file.path);
			});
			
			let response = await new Promise(function(resolve, reject) {
				let request = new XMLHttpRequest();
				request.open('POST', "source/php/upload.php", true);
				
				request.upload.addEventListener("progress", function(event) {
					progress.max = event.total;
					progress.value = event.loaded;
					pout.innerText = `${Math.round((progress.value/progress.max) * 100)}%`;
				});
				
				request.onload = function() {
					resolve(request.status);
				};

				request.send(formData);
			});
			
			if (response === 200) {
				alert("Files uploaded successfully");
				UploadBox.remove();
				FileBox.refresh();
			} else {
				alert("Files failed to upload");
				pout.remove();
				progress.remove();
			}
		});
		
		this.files.forEach(async (file) => await this.populateLine(file, render));
		return render;
	}

	async populateLine(file, render) {
		let row = render.querySelectorAll("tbody tr")[this.files.indexOf(file)];
		// Edit
		if (!row.querySelector("i")) {
			return;
		}

		// Rename
		row.querySelector("i[data-action='rename']").addEventListener("click", function(e) {
			e.stopPropagation();

			let i = row.querySelector("input[type='text']");
			if (i) { // Convert back to a element
				if (file.path != i.value) {
					file.path = i.value;
				}
				let a = getTemplate(`<a>${i.value}</a>`).querySelector("a");
				i.parentNode.replaceChild(a, i);
			} else { // Convert to input
				let a = row.querySelector('a');
				i = getTemplate(`<input type="text" value="${file.path}"></input>`).querySelector("input");
				
				i.addEventListener("keydown", function(event) {
					if (event.which == 13 || event.keyCode == 13 || event.key == 13) {
						row.querySelector("i[data-action='rename']").click();
					} else if (event.which == 27 || event.keyCode == 27 || event.key == 27) {
						this.parentNode.replaceChild(a, this);	
					}
				});

				a.parentNode.replaceChild(i, a);
			}
		});
		
		// Info
		let fileInfo = `Size: ${formatBytes(await file.getSize())}\nType: ${await file.getType()}\nPath: ${file.path}`;
		row.querySelector("i[data-action='info']").setAttribute("title", fileInfo);
		row.querySelector("i[data-action='info']").addEventListener("click", (e) => { e.stopPropagation(); alert(fileInfo); });

		// Remove
		row.querySelector("i[data-action='delete']").addEventListener("click", function(e) {
			e.stopPropagation();

			if (row.querySelector("input[type='text']")) {
				row.querySelector("i[data-action='rename']").click();
			}
			
			if (UploadBox.files.length > 1) {
				UploadBox.files.splice(UploadBox.files.indexOf(file), 1);
				UploadBox.refresh();
			} else {
				UploadBox.remove();
			}
		});
	}

	async render() {
		return getTemplate(`
		<table id="uploadBox" class="bordered">
			<thead>
				<tr>
					<td class="bordered">
						<h1>Uploaded File(s):</h1>
					</td>
					<td class="bordered">
						<div class="icons">
							<i class="material-icons" data-action="info">info_outline</i>
							<i title="Close window" class="material-icons" data-action="close">close</i>
						</div>
					</td>
				</tr>
			</thead>
			<tbody>
				${this.files.map(file => UploadBox.renderLine(file)).join('\n')}
				<tr class="bordered">
					<td colspan=2>
						<a data-action="upload">Upload files</a>
						<div></div>
					</td>
				</tr>
			</tbody>
		</table>
		`).cloneNode(true);
	}

	static renderLine(file) {
		return `
		<tr>
			<td>
				<a title="${file.path}">${file.path}</a>
			</td>
			<td>
				<div class="icons">
					<i title="Rename file" class="material-icons" data-action="rename">edit</i>
					<i class="material-icons" data-action="info">info_outline</i>
					<i title="Remove file" class="material-icons" data-action="delete">close</i>
				</div>
			</td>
		</tr>
		`;
	}
}
