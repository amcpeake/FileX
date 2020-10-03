function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function sendRequest(url, {method = 'GET', body = null, headers = {}, callback = (response) => response.ok, signal} = {}) {
	if (body) {
		body = JSON.stringify(body);
	}
	return await fetch(url, {
		signal,
		method: method,
		headers: headers,
		body: body
	}).then(callback)
	.catch(err => {
		console.log(err);
		return false;
	});
}

function setCookie(name, value, expires = "") {
	document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}`;
}

function getCookie(name) {
	  var value = "; " + document.cookie;
	  var parts = value.split("; " + name + "=");
	  if (parts.length == 2) return decodeURIComponent(parts.pop().split(";").shift());
}

function removeCookie(name) {
	document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}


function getTemplate(html) {
	let t = document.createElement("template");
	t.innerHTML = html;
	return t.content.cloneNode(true);
}


async function getTime() {
	let tTime = Date.now(); // Attempt to account for transmission time
	let curTime = await sendRequest('source/php/getTime.php', {callback: (response) => response.text()});
	tTime = Date.now() - tTime;
	tTime /= 2;
	return parseFloat(curTime) + tTime;
}


function secsToString(current, duration) {
	if (duration >= 3600) {
		return `${new Date(current * 1000).toISOString().substr(11, 8)}/${new Date(duration * 1000).toISOString().substr(11, 8)}`;
	} else {
		return `${new Date(current * 1000).toISOString().substr(14, 5)}/${new Date(duration * 1000).toISOString().substr(14, 5)}`;
	}
}

function getAlbumArt(picture) {
	return `data:${picture.format};base64,${window.btoa(picture.data.reduce((string, section) => string + String.fromCharCode(section), ''))}`;
}

async function getTags(url) {
	if (typeof(url) == "string" && ! /^https?:\/\//.test(url)) { // jsmediatags needs absolute url
		url = window.origin + url;
	}

	return await new Promise((resolve, reject) => {
		jsmediatags.read(url, {
			onSuccess: (tag) => {
				resolve(tag['tags']);
			},
			onError: (error) => {
				resolve(null);
			}
		});
	});
}

function addEventListeners(element, listeners, callback) {
	listeners.forEach((listener) => {
		element.addEventListener(listener, callback);
	});
}

function isFullscreen() { return !!(document.fullScreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement); }
