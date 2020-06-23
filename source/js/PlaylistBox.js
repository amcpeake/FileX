class PlaylistBox {
	static get target() { return document.querySelector("#bottom"); }

	static get element() { return PlaylistBox.current.element; }
	static get next() {
		if (PlaylistBox.playing) { // Already in the playlist
			if (PlaylistBox.played.indexOf(PlaylistBox.playing) != -1) { // Replaying old order
				let index = PlaylistBox.played.indexOf(PlaylistBox.playing) + 1;
				if (index >= PlaylistBox.played.length) {
					index = 0;
				}
				return PlaylistBox.played[index];
			} else if (PlaylistBox.played.length == PlaylistBox.files.length) { // End of playlist
				if (PlaylistBox.repeat) {
					return PlaylistBox.played[0];
				} else {
					return null;
				}
			} else { // Playing normally
				if (PlaylistBox.shuffle) { // Return random not already in played
					let unplayed = PlaylistBox.files.filter((file) => PlaylistBox.played.indexOf(file) == -1);
					return unplayed[Math.round(Math.random() * unplayed.length)];
				} else {
					return PlaylistBox.files[PlaylistBox.files.indexOf(PlaylistBox.playing) + 1];
				}
			}
		} else {
			return PlaylistBox.files[0];
		}
	}
	static get prev() {
	
	}
	static get files() { return PlaylistBox.current.files; }
	static set files(files) { PlaylistBox.current.files = files; }
	static get played() { return PlaylistBox.current.played; }
	static get shuffle() { return PlaylistBox.current.shuffle; }
	static get repeat() { return PlaylistBox.current.repeat; }
	static get playing() { return PlaylistBox.current.playing; }
	static set playing(file) { PlaylistBox.current.playing = file; }

	constructor(files) {
		this.files = [].concat(files); // Force input to array
		this.played = [];
		this.shuffle = false;
		this.repeat = true;
	}

	static async spawn(files) {
		let box = new PlaylistBox(files);

		if (PlaylistBox.current) {
			PlaylistBox.target.replaceChild(await box.generate(), PlaylistBox.element);
		} else {
			PlaylistBox.target.append(await box.generate());
		}

		box.element = PlaylistBox.target.lastElementChild;
		PlaylistBox.current = box;

		if (!MediaBox.current) {
			PlaylistBox.playNext();
		}
	}

	static remove() {
		PlaylistBox.element.remove();
		delete PlaylistBox.current;
		removeCookie("PlaylistBox");
		removeCookie("PlaylistBox_playing");
	}

	static async add(files) { // Add url(s), probably don't regen entire thing, maybe add renderLine?
		if (PlaylistBox.current) {
			if (Array.isArray(files)) {
				PlaylistBox.element.querySelector("tbody").appendChild(getTemplate(
					await Promise.all(files.map(file => PlaylistBox.renderLine(file))).then((lines) => lines.join('\n'))));
			} else {
				PlaylistBox.element.querySelector("tbody").appendChild(getTemplate(await PlaylistBox.renderLine(files)));
			}
			PlaylistBox.files = PlaylistBox.files.concat(files);
		} else {
			await PlaylistBox.spawn(files);
		}

		setCookie("PlaylistBox", PlaylistBox.files.map((file) => file.url).join(';'));
	}
	
	static play(file) { // SET COOKIE IN HERE
		if (!file) {
			return;
		}

		if (PlaylistBox.playing && PlaylistBox.played.length < PlaylistBox.files.length) {
			PlaylistBox.played.push(PlaylistBox.playing);
			PlaylistBox.element.querySelectorAll("tr.selected").forEach((row) => row.classList.remove("selected"));
		}
		PlaylistBox.playing = file;
		PlaylistBox.element.querySelectorAll("tbody tr")[PlaylistBox.files.indexOf(file)].classList.add("selected");
		MediaBox.play(file);

		setCookie("PlaylistBox_playing", PlaylistBox.files.indexOf(PlaylistBox.playing)); 
	}

	static playNext() { // Highlight next item in the list and return its url
		if (PlaylistBox.repeat == "one") {
			MediaBox.play(PlaylistBox.playing);
		} else if (PlaylistBox.repeat || PlaylistBox.played.length < PlaylistBox.files.length) {
			PlaylistBox.play(PlaylistBox.next);
		}
	}

	static playPrev() { // Highlight prev ""
		if (PlaylistBox.repeat == "one") {
			MediaBox.play(PlaylistBox.playing);
		} else if (PlaylistBox.played.length) {
			// If playing is in played, return one before the index of playing
		}
	}


	async generate() {
		return await this.populate(await this.render());
	}

	async populate(render) {
		// Shuffle
		render.querySelector("i[data-action='shuffle']").addEventListener("click", function(e) {
			if (this.shuffle) { // Turn it off
				this.played = [];
				this.shuffle = false;
				e.target.classList.remove("selected");
			} else {
				this.played = [];
				this.shuffle = true;
				e.target.classList.add("selected");
			}
		}.bind(this));

		// Repeat
		render.querySelector("i[data-action='repeat']").addEventListener("click", function(e) {
			if (this.repeat == "one") {
				this.repeat = false;
				e.target.classList.remove("selected");
				e.target.innerText = "repeat";
			} else if (this.repeat) {
				this.repeat = "one";
				e.target.innerText = "repeat_one";
			} else {
				this.repeat = true;
				e.target.classList.add("selected");
			}

		}.bind(this));
		
		// Close
		render.querySelector("i[data-action='close']").addEventListener("click", function(e) {
			PlaylistBox.remove();
		});

		this.files.forEach(async (file) => this.populateLine(file, render));
		
		return render;
	}

	async populateLine(file, render) {
		let row = render.querySelectorAll("tbody tr")[this.files.indexOf(file)];

		// Clicking row
		row.addEventListener("click", function(e) {
			// If playing, push to played
			this.played = [];
			PlaylistBox.play(file);
		}.bind(this));

		// Remove
		row.querySelector("i[data-action='remove']").addEventListener("click", function(e) {
			e.stopPropagation();
		});
	}

	async render() {
		return await getTemplate(`
		<table id="playlistBox">
			<thead>
				<tr class="bordered">
					<td class="bordered"><h1>Playlist</h1></td>
					<td>
						<div class="icons">
							<i title="Shuffle" class="material-icons" data-action="shuffle">shuffle</i>
							<i title="Repeat" class="material-icons selected" data-action="repeat">repeat</i>
							<i title="Close" class="material-icons" data-action="close">close</i>
						</div>
					</td>
				</tr>
			</thead>
			<tbody class="bordered">
				${await Promise.all(this.files.map(file => PlaylistBox.renderLine(file))).then((lines) => lines.join('\n'))}	
			</tbody>
		</table>
		`).cloneNode(true);
	}

	static async renderLine(file) {
		return `
		<tr>
			<td><a title="${await file.getDisplayName()}">${await file.getDisplayName()}</a></td>
			<td>
				<div class="icons">
					<i title="Remove from playlist" class="material-icons" data-action="remove">close</i>
				</div>
			</td>
		</tr>
		`;
	}
}
