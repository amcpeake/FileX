class MediaBox {
	static get target() { return document.querySelector("#bottom"); }
	
	static get file() { return MediaBox.current.file; }
	static set file(file) { MediaBox.current.file = file; }
	static get simulcast() { return MediaBox.current.simulcast; }
	static get element() { return MediaBox.current.element; }

	constructor(file, simulcast) {
		this.file = file;
		this.simulcast = parseInt(simulcast);
	}


	static async spawn(file, simulcast = false) {
		let box = new MediaBox(file, simulcast);

		if (MediaBox.current) {
			MediaBox.target.replaceChild(await box.generate(), MediaBox.element);
			MediaBox.remove();
		} else {
			MediaBox.target.prepend(await box.generate());
		}

		box.element = MediaBox.target.firstElementChild;
		MediaBox.current = box;

		if (box.simulcast) {
			setCookie("MediaBox", box.simulcast);
			if (!!window.EventSource) {
				box.sse = new EventSource(`/source/php/sync.php?channel=${box.simulcast}`);
				box.sse.addEventListener("update", function(e) {
					MediaBox.sync(JSON.parse(e.data));
				});
			}

		} else if (box.file) {
			setCookie("MediaBox", box.file.url);
		}
	}
	
	static async play(file) {
		if (MediaBox.current && MediaBox.element) {
			if (MediaBox.simulcast) {
				await sendRequest('/source/php/sync.php', {method: 'POST',
					body: {timestamp: await getTime(), url: file.url, playtime: 0, playing: false, 
					speed: 1, channel: MediaBox.simulcast}});
				MediaBox.refresh();
			} else {
				MediaBox.file = file;
				MediaBox.element.querySelector("video").setAttribute("src", file.url);
				MediaBox.element.querySelector("video").play();
			}
		} else {
			await MediaBox.spawn(file);
		}
	}

	static refresh() {
		let file = MediaBox.file;
		let sc = MediaBox.simulcast;
		MediaBox.remove();
		MediaBox.spawn(file, sc);
	}

	static remove() {
		FileBox.setCallback((file) => MediaBox.play(file), false);
		MediaBox.element.remove();
		if (MediaBox.current.sse) {
			MediaBox.current.sse.close();
		}
		delete MediaBox.current;
		removeCookie("MediaBox");
	}

	static async sync(response) { // Sync player to video state
		let video = MediaBox.element.querySelector("video");
		console.log(response);	
		if ('url' in response) {
			MediaBox.file = new FileInfo(response['url']);
			video.setAttribute('src', response['url']);
		}
		
		if ('speed' in response) {
			video.playbackRate = response['speed'];
		}
		
		if ('playtime' in response) {
			if (response['playing'] || !video.paused) {
				video.currentTime = response['playtime'] + (((await getTime() - response['timestamp']) / 1000) / video.playbackRate);
				console.log(video.currentTime);
			} else {
				video.currentTime = response['playtime'];
			}
		}


		if ('playing' in response) {
			if (response['playing']) {
				console.log(video.currentTime);
				video.play();
			} else {
				video.pause();
			}
		}
	}

	static kbshortcut(e) { // Must be globally defined to allow window.removeEventListener()
		if (MediaBox.element.querySelector("i[data-action='play']") && 
			(e.which == 75 || e.which == 32 || e.keyCode == 179 || e.keyCode == 107 || e.keyCode == 32 || e.key == 75 || e.key == 32)) {
			e.stopPropagation();
			MediaBox.element.querySelector("i[data-action='play']").click();
		}

	}

	async generate() {
		if (this.simulcast) {
			return await this.populateSimulcast(await this.renderSimulcast());
		} else {
			return await this.populate(await this.render());
		}
	}

	async populate(render) {
		// Scroll into view on load
		render.querySelector("tbody tr td > *").addEventListener("load", () => {
			window.scrollTo(0,document.body.scrollHeight);
		});

		// NoSleep
		render.querySelector("i[data-action='nosleep']").addEventListener("click", function() {
			if (this.classList.contains("selected")) {
				this.classList.remove("selected");
				document.nosleep.disable();
			} else {
				this.classList.add("selected");
				document.nosleep.enable();
			}
		});
		
		// Close
		render.querySelector("i[data-action='close']").addEventListener("click", () => {
			MediaBox.remove();
		});

		this.populatePlayer(render);
		return render;
	}

	async populateSimulcast(render) {
		this.populatePlayer(render);
		this.populate(render);
		let video = render.querySelector("video");

		// Channel button
		render.querySelector("i[data-action='channel']").addEventListener("click", function() {
			MediaBox.spawn(null, prompt("Channel"));
		});

		// Resync button
		render.querySelector("i[data-action='refresh']").addEventListener("click", function() {
			MediaBox.refresh();
		});

		// Restart track
		render.querySelector("i[data-action='prev']").addEventListener("click", async function(e) {
			if (video.currentTime > 2) {
				await sendRequest('/source/php/sync.php', {method: 'POST',
					body: {channel: MediaBox.simulcast, timestamp: await getTime(), playtime: 0, playing: false}}
				);
			}
		});

		// Play/Pause stream
		render.querySelector("i[data-action='play']").addEventListener("click", async function(e) {
			await sendRequest('/source/php/sync.php', {method: 'POST',
				body: {channel: MediaBox.simulcast, timestamp: await getTime(), playtime: video.currentTime, playing: !video.paused}}
			);
		});

		// Seeked
		render.querySelector("input[data-action='playback']").addEventListener("change", async function() {
			await sendRequest('/source/php/sync.php', {method: 'POST',
				body: {channel: MediaBox.simulcast, timestamp: await getTime(), playtime: video.currentTime}}
			);
		});

		// Speed
		render.querySelector("input[data-action='speed']").addEventListener("change", async function() {
			await sendRequest('/source/php/sync.php', {method: 'POST',
				body: {channel: MediaBox.simulcast, timestamp: await getTime(), speed: video.playbackRate}}
			);
		});

		return render;
	}
	
	async populatePlayer(render) {
		let controls = render.querySelector(".controls");
		let video = render.querySelector("video");

		// Video events should alter the controls (to support simulcast)
		video.addEventListener("loadedmetadata", async function() {
			let a = controls.querySelector("a");
			a.innerText = secsToString(0, this.duration);
			
			let tags = await MediaBox.file.getTags();
			if (tags && tags.picture) {
				this.poster = getAlbumArt(tags.picture);
			}

			MediaBox.element.querySelector("thead h1").innerText = `Playing ${await MediaBox.file.getDisplayName()}`;
		});

		video.addEventListener("play", function() {
			controls.querySelector("i[data-action='play']").innerText = "pause";
		});

		video.addEventListener("pause", function() {
			controls.querySelector("i[data-action='play']").innerText = "play_arrow";
		});

		video.addEventListener("timeupdate", function() {
			if (this.currentTime && this.duration) {
				let a = controls.querySelector("a");
				a.innerText = secsToString(this.currentTime, this.duration);

				controls.querySelector("input[data-action='playback']").value = (100 / this.duration) * this.currentTime;
			}
		});
		
		video.addEventListener("volumechange", function() {
			let button = controls.querySelector("i[data-action='mute']");
			let slider = controls.querySelector("input[data-action='volume']");
			if (this.muted || this.volume == 0) {
				button.innerText = "volume_off";
				slider.value = 0;
			} else {
				button.innerText = "volume_up";
				slider.value = this.volume;
			}
		});

		video.addEventListener("ratechange", function() {
			controls.querySelector("input[data-action='speed']").value = this.playbackRate;
		});
		
		let timeout = window.setTimeout(function() {
			if (!video.paused && isFullscreen()) {
				controls.dataset.state = "hidden";
			}
		}, 5000);

		video.parentNode.addEventListener("mousemove", function() {
			controls.dataset.state = "visible";
			window.clearTimeout(timeout);
			timeout = window.setTimeout(function() {
				if (!video.paused && isFullscreen()) {
					controls.dataset.state = "hidden";
				}
			}, 5000);
		});
		
		video.addEventListener("ended", function() {
			if (PlaylistBox.current) {
				PlaylistBox.playNext();
			}
		});

		// Prevent/override default events
		video.addEventListener("keyup", function(e) {
			e.stopPropagation();
		});
		
		window.removeEventListener("keydown", MediaBox.kbshortcut, true);
		window.addEventListener("keydown", MediaBox.kbshortcut, true);

		video.addEventListener("click", function(e) {
			e.stopPropagation();
			controls.querySelector("i[data-action='play']").click();
		});
		video.addEventListener("dblclick", function() {
			controls.querySelector("i[data-action='fullscreen']").click();
		});

		// Previous song
		controls.querySelector("i[data-action='prev']").addEventListener("click", function() {
			if (video.currentTime <= 2) { // If in first 2s
				PlaylistBox.playPrevious();
			} else {
				video.currentTime = 0;
			}
		});

		// Play
		controls.querySelector("i[data-action='play']").addEventListener("click", function() {
			console.log("clicked play");
			if (video.paused) {
				video.play();	
			} else {
				video.pause();
			}
		});

		// Next song
		controls.querySelector("i[data-action='next']").addEventListener("click", function() {
			PlaylistBox.playNext();
		});

		// Seek
		controls.querySelector("input[data-action='playback']").addEventListener("input", function() {
			let a = controls.querySelector("a");
			a.innerText = secsToString(video.currentTime, video.duration);
			video.currentTime = video.duration * (this.value / 100);
			
			if (video.seeking) {
				video.pause();
			} else if (!video.paused) { 
				video.play();
			}
		});

		// Volume
		controls.querySelector("i[data-action='mute']").addEventListener("click", function() {
			video.muted = !video.muted;
		});
		controls.querySelector("input[data-action='volume']").addEventListener("input", function() {
			video.volume = this.value;
		});

		// Speed
		controls.querySelector("i[data-action='slow']").addEventListener("click", function() {
			if (video.playbackRate - 0.25 >= 0) {
				video.playbackRate -= 0.25;
			} else {
				video.playbackRate = 0;
			}
		});
		controls.querySelector("input[data-action='speed']").addEventListener("change", function() {
			video.playbackRate = this.value;
		});
		controls.querySelector("i[data-action='fast']").addEventListener("click", function() {
			if (video.playbackRate + 0.25 <= 20) {
				video.playbackRate += 0.25;
			} else {
				video.playbackRate = 20;
			}
		});

		// Subtitles
		controls.querySelector("i[data-action='addsubs']").addEventListener("click", function() {
			if (video.querySelector("track")) {
				video.querySelector("track").remove();
			}
			FileBox.setCallback((file) => {
				video.appendChild(getTemplate(`
					<track kind="subtitles" srclang="en" src="${file.url}" default>
				`));
			});
		});
		
		// Cast
		render.querySelector("i[data-action='cast']").addEventListener("click", () => {
			document.querySelector("#cast").click();
		});
		
		// Fullscreen
		render.querySelector("i[data-action='fullscreen']").addEventListener("click", function() {
			if (isFullscreen()) {	
				if (document.exitFullscreen) document.exitFullscreen();
				else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
				else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
				else if (document.msExitFullscreen) document.msExitFullscreen();
			} else {
				if (video.parentNode.requestFullscreen) video.parentNode.requestFullscreen();
				else if (video.parentNode.mozRequestFullScreen) video.parentNode.mozRequestFullScreen();
				else if (video.parentNode.webkitRequestFullScreen) video.parentNode.webkitRequestFullScreen();
				else if (video.parentNode.msRequestFullscreen) video.parentNode.msRequestFullscreen();
			}
		});
	}


	async render() {
		return getTemplate(`
		<table id="mediaBox" class="bordered">
			<thead>
				<tr>
					<td>
						<h1 title="${await this.file.path}">${this.file.path}</h1>
					</td>
					<td class="bordered">
						<div class="icons">
							<i title="NoSleep toggle" class="material-icons" data-action="nosleep">snooze</i>
							<i title="Close" class="material-icons" data-action="close">close</i>
						</div>
					</td>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td colspan=2>
						${await this.renderPlayer()}
					</td>
				</tr>
			</tbody>
		</table>
		`).cloneNode(true);
	}

	async renderSimulcast() {
		return getTemplate(`
		<table id="mediaBox" class="bordered">
			<thead>
				<tr>
					<td>
						<h1 title="Cast ${this.simulcast}">Cast ${this.simulcast}</h1>
					</td>
					<td class="bordered">
						<div class="icons">
							<i data-action="change" class="material-icons">add_to_queue</i>
							<i data-action="channel" class="material-icons">filter_${this.simulcast}</i>
							<i title="Resync" class="material-icons" data-action="refresh">sync</i>
							<i title="NoSleep toggle" class="material-icons" data-action="nosleep">snooze</i>
							<i title="Close" class="material-icons" data-action="close">close</i>
						</div>
					</td>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td colspan=2>
						<div class="player">
							<video></video>
							${this.renderControls()}
						</div>
					</td>
				</tr>
			</tbody>
		</table>
		`).cloneNode(true);
	}
	
	async renderPlayer() {
		let player = '';
		let MIME = await this.file.getType(); 
		
		if (!MIME) {
			player = `<iframe src="${this.file.url}"></iframe>`;
		} else if (MIME.includes("image")) { // Display an image
			player = `<img src="${this.file.url}"></img>`;
		} else if (MIME.includes("video") || MIME.includes("audio")) { // Display song/video, add speed control, TRY to add cast button
			player = `
			<video controls name="media" src="${this.file.url}"></video>
			`;
		} else if (MIME.includes("text")) {
			player = `
			<textarea>
				${await sendRequest(this.file.url, {method: 'GET', callback: (response) => response.text()})}
			</textarea>
			`;
		}
		
		return `
		<div class="player">
			${player}
			${this.renderControls()}
		</div>
		`;
	}

	renderControls() {
		return `
		<div class="controls">
			<i title="Previous song" class="material-icons" data-action="prev">skip_previous</i>
			<i title="Play/Pause (k)" class="material-icons" data-action="play">play_arrow</i>
			<i title="Next song" class="material-icons" data-action="next">skip_next</i>
			<a>0:00/0:00</a>
			<input type="range" value="0" data-action="playback">
			<i class="material-icons" data-action="mute">volume_up</i>
			<input type="range" min="0" max="1" step="0.1" value="1" data-action="volume">
			<input type="number" min="0" max="20" step="any" data-action="speed" value="1">
			<i class="material-icons" data-action="addsubs">subtitles</i>
			<i class="material-icons" data-action="cast">cast</i>
			<i class="material-icons" data-action="fullscreen">fullscreen</i>
			<i title="Slow down" class="material-icons" data-action="slow">fast_rewind</i>
			<i title="Speed up" class="material-icons" data-action="fast">fast_forward</i>
		</div>
		`;

	}
}
