class FileInfo {
	async getSize() {
		if (!this.size) {
			let headers = await sendRequest(this.url, {method: 'HEAD', callback: (response) => response.headers});
			this.size = headers.get('Content-Length');
			if (!this.type) {
				this.type = headers.get('Content-Type');
			}
		}
		return this.size;
	}
	async getType() { 
		if (!this.type) {
			let headers = await sendRequest(this.url, {method: 'HEAD', callback: (response) => response.headers});
			this.type = headers.get('Content-Type');
			if (!this.size) {
				this.size = headers.get('Content-Length');
			}
		}
		return this.type; 
	}
	async getTags() { 
		if (!this.tags) {
			let tags = await getTags(this.url);
			if (tags) {
				this.tags = tags;
			}
		}
		return this.tags;
	}
	async getDisplayName() {
		if (!this.displayname) {
			let title = '';
			let tags = await this.getTags();
		
			if (tags) {
				if (tags['artist']) {
					title = `${tags['artist']} - `;		
				}
				if (tags['title']) {
					title += tags['title'];
				} else {
					title += this.filename.split('.').slice(0, -1).join('.');
				}
			} else {
				title = this.filename.split('.').slice(0, -1).join('.');
			}
			this.displayname = title;
		}
		return this.displayname;
	}

	constructor(file) {
		if (typeof(file) == "string") { // URL
			this.url = file.replace(window.origin, ''); // Convert absolute to relative
			this.path = decodeURIComponent(this.url);
			
			if (this.url.substr(-1) == '/') {
				this.type = "directory";
				this.filename = this.path.match(/([^\/]*)\/*$/)[1];
			} else {
				this.filename = this.path.split('/').pop();
				// Local servers will most likely not have an SSL cert in the chromecast's trust chain, 
				// therefore HTTP is used instead
				this.castURL = "http://" + window.location.host + this.url;
			}
		} else if (file instanceof File) {
			this.filename = file.name;
			this.url = FileBox.url + this.filename;
			this.path = decodeURIComponent(this.url);
			this.type = file.type;
			this.size = file.size;
			this.file = file; // Include pointer to file
		}

	}
}
